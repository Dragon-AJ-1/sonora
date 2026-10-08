#!/usr/bin/env node
/**
 * SONORA Telegram → repo sync
 * Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
 * Also tracks voice/video chat start/end → audio/live-status.json
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID || '@MrA_Music';
const ROOT = process.cwd();
const AUDIO = path.join(ROOT, 'audio');
const MANIFEST = path.join(AUDIO, 'manifest.json');
const FEED = path.join(AUDIO, 'radio-feed.json');
const LIVE = path.join(AUDIO, 'live-status.json');
const OFFSET_FILE = path.join(ROOT, '.telegram-offset');

if (!TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN secret');
  process.exit(1);
}

function api(method, params = {}) {
  const url = new URL(`https://api.telegram.org/bot${TOKEN}/${method}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  return fetch(url).then(async (r) => {
    const j = await r.json();
    if (!j.ok) throw new Error(j.description || method);
    return j.result;
  });
}

function slug(s) {
  return (
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'track'
  );
}

function parseCaption(text) {
  const out = { title: '', artist: '', album: '', year: null, genre: '', duration: '' };
  if (!text) return out;
  const lines = String(text).split(/\r?\n/);
  const map = [
    [/^(title|عنوان)\s*[:：]\s*(.+)$/i, 'title'],
    [/^(artist|خواننده)\s*[:：]\s*(.+)$/i, 'artist'],
    [/^(album|آلبوم)\s*[:：]\s*(.+)$/i, 'album'],
    [/^(year|سال)\s*[:：]\s*(\d{4})\s*$/i, 'year'],
    [/^(genre|ژانر)\s*[:：]\s*(.+)$/i, 'genre'],
    [/^(duration|مدت)\s*[:：]\s*([\d:]+)\s*$/i, 'duration']
  ];
  for (const line of lines) {
    const t = line.trim();
    for (const [re, key] of map) {
      const m = t.match(re);
      if (m) {
        out[key] = key === 'year' ? parseInt(m[2], 10) : m[2].trim();
        break;
      }
    }
  }
  if (!out.title || !out.artist) {
    const first = lines.map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !l.startsWith('🎵'));
    if (first && first.includes(' - ')) {
      const [a, ...rest] = first.split(' - ');
      if (!out.artist) out.artist = a.trim();
      if (!out.title) out.title = rest.join(' - ').trim();
    }
  }
  return out;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function setLive(live, title) {
  writeJson(LIVE, {
    live: !!live,
    title: title || (live ? 'Channel voice chat is live' : ''),
    link: CHANNEL.startsWith('@') ? `https://t.me/${CHANNEL.slice(1)}` : 'https://t.me/MrA_Music',
    updatedAt: new Date().toISOString(),
    note: 'Telegram VC audio cannot play inside a website. Join via Telegram.'
  });
}

async function downloadFile(fileId, dest) {
  const f = await api('getFile', { file_id: fileId });
  const url = `https://api.telegram.org/file/bot${TOKEN}/${f.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('download failed');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 18 * 1024 * 1024) throw new Error('file too large (>18MB)');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function upsertManifest(meta, fileRel) {
  const man = readJson(MANIFEST, { tracks: [] });
  if (!Array.isArray(man.tracks)) man.tracks = [];
  const entry = {
    id: meta.id,
    file: fileRel,
    title: meta.title,
    artist: meta.artist,
    album: meta.album || 'Singles',
    year: meta.year || new Date().getFullYear(),
    genre: meta.genre || 'Independent',
    duration: meta.duration || undefined
  };
  const i = man.tracks.findIndex((t) => t.id === meta.id);
  if (i >= 0) man.tracks[i] = entry;
  else man.tracks.push(entry);
  writeJson(MANIFEST, man);
}

function upsertFeed(meta, fileRel, caption) {
  const feed = readJson(FEED, { tracks: [], messages: [] });
  if (!Array.isArray(feed.tracks)) feed.tracks = [];
  if (!Array.isArray(feed.messages)) feed.messages = [];
  feed.updatedAt = new Date().toISOString();
  if (!feed.station) {
    feed.station = { id: 'tg-live', name: 'SONORA Live', tag: 'From the channel', host: 'Channel' };
  }
  const row = { id: meta.id, title: meta.title, artist: meta.artist, file: fileRel };
  const ix = feed.tracks.findIndex((t) => t.id === meta.id);
  if (ix >= 0) feed.tracks[ix] = row;
  else feed.tracks.push(row);
  if (caption) {
    feed.messages.push({ t: String(caption).slice(0, 200), at: feed.updatedAt });
    feed.messages = feed.messages.slice(-20);
  }
  writeJson(FEED, feed);
}

function chatMatches(chat) {
  if (!chat) return false;
  const uname = chat.username ? '@' + chat.username : '';
  const idStr = String(chat.id || '');
  if (CHANNEL.startsWith('@')) return uname.toLowerCase() === CHANNEL.toLowerCase();
  return idStr === String(CHANNEL);
}

async function processUpdate(u) {
  const msg = u.channel_post || u.message;
  if (!msg) return false;
  if (!chatMatches(msg.chat)) return false;

  // Voice / video chat service messages
  if (msg.video_chat_started || msg.video_chat_scheduled) {
    console.log('Voice chat STARTED');
    setLive(true, 'Channel voice chat is live');
    return true;
  }
  if (msg.video_chat_ended) {
    console.log('Voice chat ENDED');
    setLive(false, '');
    return true;
  }

  const audio =
    msg.audio ||
    msg.voice ||
    (msg.document && /audio|mpeg|mp3/i.test(msg.document.mime_type || '') ? msg.document : null);
  if (!audio) return false;

  const cap = parseCaption(msg.caption || msg.text || '');
  const title = cap.title || audio.title || audio.file_name || 'Untitled';
  const artist = cap.artist || audio.performer || 'Unknown Artist';
  const id = slug(artist + '-' + title);
  const fileRel = `audio/${id}.mp3`;
  const dest = path.join(ROOT, fileRel);

  if (fs.existsSync(dest)) {
    console.log('Already have', id, '— refreshing metadata');
  } else {
    console.log('Downloading', title, '—', artist);
    await downloadFile(audio.file_id, dest);
  }

  const meta = {
    id,
    title,
    artist,
    album: cap.album,
    year: cap.year,
    genre: cap.genre,
    duration:
      cap.duration ||
      (audio.duration
        ? `${Math.floor(audio.duration / 60)}:${String(audio.duration % 60).padStart(2, '0')}`
        : '')
  };
  upsertManifest(meta, fileRel);
  upsertFeed(meta, fileRel, msg.caption || `${artist} — ${title}`);
  return true;
}

async function main() {
  let offset = 0;
  try {
    offset = parseInt(fs.readFileSync(OFFSET_FILE, 'utf8'), 10) || 0;
  } catch {}

  console.log('Polling Telegram from offset', offset, 'channel', CHANNEL);
  const updates = await api('getUpdates', {
    offset,
    limit: 50,
    timeout: 0,
    allowed_updates: JSON.stringify(['channel_post', 'message'])
  });
  console.log('Updates:', updates.length);

  let changed = false;
  let maxOffset = offset;
  for (const u of updates) {
    maxOffset = Math.max(maxOffset, u.update_id + 1);
    try {
      if (await processUpdate(u)) changed = true;
    } catch (e) {
      console.error('update failed', u.update_id, e.message);
    }
  }
  fs.writeFileSync(OFFSET_FILE, String(maxOffset));

  if (changed) {
    execSync('git config user.name "sonora-bot"');
    execSync('git config user.email "sonora-bot@users.noreply.github.com"');
    execSync('git add audio/ .telegram-offset || true');
    try {
      execSync('git diff --cached --quiet');
      console.log('Nothing to commit');
    } catch {
      execSync('git commit -m "chore(telegram): sync channel audio / live status"');
      execSync('git push');
      console.log('Pushed changes');
    }
  } else {
    console.log('No new audio/VC events');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
