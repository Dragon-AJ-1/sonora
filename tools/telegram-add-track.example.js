/**
 * SONORA — Example Telegram bot that commits new tracks to the repo.
 *
 * Usage:
 *   1. npm i node-telegram-bot-api @octokit/rest
 *   2. Set env: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, TELEGRAM_BOT_TOKEN
 *   3. node tools/telegram-add-track.example.js
 *
 * Bot listens for audio/document messages in a channel or private chat
 * and pushes them to audio/ + updates audio/manifest.json.
 *
 * This is a starting point — harden auth, error handling and size limits
 * before production use.
 */

'use strict';

const TelegramBot = require('node-telegram-bot-api');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER || 'Dragon-AJ-1';
const REPO = process.env.GITHUB_REPO || 'sonora';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!GITHUB_TOKEN || !TG_TOKEN) {
  console.error('Missing GITHUB_TOKEN or TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const bot = new TelegramBot(TG_TOKEN, { polling: true });

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'track';
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
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
  await octokit.repos.createOrUpdateFileContents(params);
}

bot.on('message', async msg => {
  try {
    const audio = msg.audio || msg.voice || (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('audio/') ? msg.document : null);
    if (!audio) return;

    const fileId = audio.file_id;
    const fileName = audio.file_name || `tg-${Date.now()}.mp3`;
    const caption = msg.caption || '';

    // Parse "Title - Artist" from caption if present
    let title = path.basename(fileName, path.extname(fileName));
    let artist = 'Telegram';
    let album = 'From Channel';
    if (caption) {
      const parts = caption.split(/\s[-–—]\s/);
      if (parts.length >= 2) {
        title = parts[0].trim();
        artist = parts[1].trim();
      } else {
        title = caption.trim();
      }
    }

    const id = slug(title + '-' + artist) + '-' + Date.now().toString(36).slice(-4);
    const audioPath = `audio/${id}.mp3`;

    bot.sendMessage(msg.chat.id, `⏳ در حال اضافه کردن «${title}» به SONORA...`);

    // Download from Telegram
    const tgFile = await bot.getFile(fileId);
    const tgUrl = `https://api.telegram.org/file/bot${TG_TOKEN}/${tgFile.file_path}`;
    const buffer = await downloadFile(tgUrl);

    // Upload MP3
    await putFile(audioPath, buffer, `Add track: ${title} — ${artist}`);

    // Update manifest
    const man = await getFileContent('audio/manifest.json');
    let data = { tracks: [] };
    if (man) {
      try { data = JSON.parse(man.content); } catch (_) {}
    }
    if (!Array.isArray(data.tracks)) data.tracks = [];

    data.tracks.push({
      id,
      file: audioPath,
      title,
      artist,
      album,
      year: new Date().getFullYear(),
      genre: 'From Telegram'
    });

    await putFile(
      'audio/manifest.json',
      JSON.stringify(data, null, 2) + '\n',
      `Manifest: add ${id}`,
      man ? man.sha : undefined
    );

    bot.sendMessage(msg.chat.id, `✅ اضافه شد.\nID: \`${id}\`\nپس از چند ثانیه در سایت ظاهر می‌شود.`);
  } catch (err) {
    console.error(err);
    try { bot.sendMessage(msg.chat.id, '❌ خطا: ' + (err.message || err)); } catch (_) {}
  }
});

console.log('SONORA Telegram bot listening...');
