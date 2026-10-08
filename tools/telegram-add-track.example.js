/**
 * SONORA — Production-oriented example: Telegram bot → GitHub commit
 *
 * Features:
 *  - Accepts audio / voice / audio documents from a channel or private chat
 *  - Optional admin whitelist (TELEGRAM_ADMIN_IDS)
 *  - Size limit (default 20 MB)
 *  - Parses "Title - Artist" from caption
 *  - Uploads MP3 + updates audio/manifest.json via GitHub Contents API
 *  - Idempotent-ish (unique id per upload)
 *
 * Setup:
 *   npm i node-telegram-bot-api @octokit/rest
 *   export GITHUB_TOKEN=ghp_...
 *   export GITHUB_OWNER=Dragon-AJ-1
 *   export GITHUB_REPO=sonora
 *   export TELEGRAM_BOT_TOKEN=123456:ABC...
 *   export TELEGRAM_ADMIN_IDS=123456789,987654321   # optional, comma-separated
 *   node tools/telegram-add-track.example.js
 *
 * Make the bot an admin of the channel so it receives channel posts.
 */

'use strict';

const TelegramBot = require('node-telegram-bot-api');
const { Octokit } = require('@octokit/rest');
const path = require('path');
const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER || 'Dragon-AJ-1';
const REPO = process.env.GITHUB_REPO || 'sonora';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(Number);
const MAX_BYTES = Number(process.env.MAX_AUDIO_BYTES) || 20 * 1024 * 1024; // 20 MB

if (!GITHUB_TOKEN || !TG_TOKEN) {
  console.error('Missing GITHUB_TOKEN or TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const bot = new TelegramBot(TG_TOKEN, { polling: true });

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-') // keep Persian letters
    .replace(/^-+|-+$/g, '') || 'track';
}

function isAdmin(msg) {
  if (!ADMIN_IDS.length) return true; // no whitelist = allow everyone
  const uid = msg.from && msg.from.id;
  return ADMIN_IDS.includes(uid);
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      let total = 0;
      res.on('data', c => {
        total += c.length;
        if (total > MAX_BYTES) {
          res.destroy();
          reject(new Error('File too large (max ' + Math.round(MAX_BYTES / 1024 / 1024) + ' MB)'));
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getFileContent(pathInRepo) {
  try {
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: pathInRepo,
      ref: 'main'
    });
    return {
      sha: data.sha,
      content: Buffer.from(data.content, 'base64').toString('utf8')
    };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

async function putFile(pathInRepo, content, message, sha) {
  const params = {
    owner: OWNER,
    repo: REPO,
    path: pathInRepo,
    message,
    content: Buffer.isBuffer(content)
      ? content.toString('base64')
      : Buffer.from(content, 'utf8').toString('base64'),
    branch: 'main'
  };
  if (sha) params.sha = sha;
  const { data } = await octokit.repos.createOrUpdateFileContents(params);
  return data;
}

function parseMeta(caption, fileName) {
  let title = path.basename(fileName || 'track', path.extname(fileName || ''));
  let artist = 'Telegram';
  let album = 'From Channel';
  let genre = 'From Telegram';

  if (caption) {
    // Title - Artist | Album | Genre
    const segs = caption.split('|').map(s => s.trim());
    const main = segs[0] || '';
    const parts = main.split(/\s[-–—]\s/);
    if (parts.length >= 2) {
      title = parts[0].trim();
      artist = parts.slice(1).join(' - ').trim();
    } else if (main) {
      title = main;
    }
    if (segs[1]) album = segs[1];
    if (segs[2]) genre = segs[2];
  }
  return { title, artist, album, genre };
}

bot.on('message', async msg => {
  try {
    // Channel posts arrive as channel_post; polling also emits them as message sometimes
    if (!isAdmin(msg) && msg.chat && msg.chat.type !== 'channel') {
      // for private chats enforce admin list; channels can be restricted by bot admin status
      return;
    }

    const audio =
      msg.audio ||
      msg.voice ||
      (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('audio/')
        ? msg.document
        : null);

    if (!audio) return;

    if (audio.file_size && audio.file_size > MAX_BYTES) {
      await bot.sendMessage(msg.chat.id, '❌ فایل بزرگ‌تر از حد مجاز است.');
      return;
    }

    const fileId = audio.file_id;
    const fileName = audio.file_name || `tg-${Date.now()}.mp3`;
    const caption = msg.caption || msg.text || '';
    const meta = parseMeta(caption, fileName);

    const id =
      slug(meta.title + '-' + meta.artist) +
      '-' +
      Date.now().toString(36).slice(-5);
    const audioPath = `audio/${id}.mp3`;

    const status = await bot.sendMessage(
      msg.chat.id,
      `⏳ در حال اضافه کردن «${meta.title}» توسط ${meta.artist}...`
    );

    const tgFile = await bot.getFile(fileId);
    const tgUrl = `https://api.telegram.org/file/bot${TG_TOKEN}/${tgFile.file_path}`;
    const buffer = await downloadFile(tgUrl);

    await putFile(audioPath, buffer, `Add track: ${meta.title} — ${meta.artist}`);

    const man = await getFileContent('audio/manifest.json');
    let data = { tracks: [] };
    if (man) {
      try {
        data = JSON.parse(man.content);
      } catch (_) {}
    }
    if (!Array.isArray(data.tracks)) data.tracks = [];

    // avoid exact duplicate id
    data.tracks = data.tracks.filter(t => t && t.id !== id);
    data.tracks.push({
      id,
      file: audioPath,
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      year: new Date().getFullYear(),
      genre: meta.genre
    });

    await putFile(
      'audio/manifest.json',
      JSON.stringify(data, null, 2) + '\n',
      `Manifest: add ${id}`,
      man ? man.sha : undefined
    );

    await bot.editMessageText(
      `✅ اضافه شد.\n• ${meta.title} — ${meta.artist}\n• ID: \`${id}\`\n• چند ثانیه تا ظاهر شدن در سایت`,
      { chat_id: msg.chat.id, message_id: status.message_id, parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error(err);
    try {
      await bot.sendMessage(msg.chat.id, '❌ خطا: ' + (err.message || String(err)));
    } catch (_) {}
  }
});

// Also handle channel_post events explicitly
bot.on('channel_post', msg => bot.emit('message', msg));

console.log('SONORA Telegram bot listening…');
console.log('Repo:', OWNER + '/' + REPO);
if (ADMIN_IDS.length) console.log('Admin IDs:', ADMIN_IDS.join(', '));
else console.log('No admin whitelist — anyone can trigger (channel restricted by bot admin status).');
