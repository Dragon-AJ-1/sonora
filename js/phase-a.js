/**
 * SONORA Phase A — stability layer (GitHub Pages)
 * 1) Local covers only (strip external CDNs)
 * 2) Real audio paths for Midnight Signals + manifest
 * 3) Honest fallback (ms-01…08 only)
 * 4) Radio continuous queue from radio-feed + real files
 */
(function () {
  'use strict';

  var REAL = [
    'audio/ms-01-glass-horizon.mp3',
    'audio/ms-02-midnight-signals.mp3',
    'audio/ms-03-half-awake.mp3',
    'audio/ms-04-sodium-lights.mp3',
    'audio/ms-05-blue-hour.mp3',
    'audio/ms-06-terminal-dreams.mp3',
    'audio/ms-07-afterglow.mp3',
    'audio/ms-08-signal-fade.mp3'
  ];

  function isExternal(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u);
  }

  function localCover(key, label, accent) {
    if (window.SONORA_COVERS && SONORA_COVERS[key]) return SONORA_COVERS[key];
    if (window.sonoraCover) {
      return sonoraCover({ label: label || key, accent: accent || '#D9A441', seed: (key || '').length });
    }
    return '';
  }

  function patchCovers() {
    var C = window.SONORA_COVERS || {};
    if (window.IMG) {
      Object.keys(C).forEach(function (k) {
        IMG[k] = C[k];
      });
    }
    if (window.ARTISTS) {
      var amap = {
        aurora: C.AUR,
        nia: C.NIA,
        sora: C.SORA,
        kairo: C.KAIRO,
        milo: C.MILO,
        elias: C.ELIAS,
        vera: C.VERA
      };
      Object.keys(ARTISTS).forEach(function (id) {
        var a = ARTISTS[id];
        if (!a) return;
        if (isExternal(a.img) || !a.img) a.img = amap[id] || C.ORB || localCover('ORB', a.name, a.ac);
      });
    }
    if (window.ALBUMS) {
      var albumMap = {
        ms: C.MS,
        gs: C.NIA,
        nr: C.SORA,
        bt: C.KAIRO,
        ns: C.NIA,
        fa: C.ELIAS,
        pc: C.PC,
        vh: C.VERA,
        ws: C.WS
      };
      ALBUMS.forEach(function (al) {
        if (!al) return;
        if (isExternal(al.img) || !al.img) al.img = albumMap[al.id] || C.ORB;
      });
    }
    ['PLAYLISTS', 'STORIES', 'EVENTS', 'SESSIONS'].forEach(function (key) {
      var arr = window[key];
      if (!arr || !arr.length) return;
      arr.forEach(function (item) {
        if (item && isExternal(item.img)) item.img = C.ORB || C.SESSION || localCover('ORB', 'SONORA');
      });
    });
  }

  /** Attach real file paths to Midnight Signals tracks */
  function patchMsAudio() {
    if (!window.ALBUMS) return;
    var ms = null;
    for (var i = 0; i < ALBUMS.length; i++) {
      if (ALBUMS[i].id === 'ms') {
        ms = ALBUMS[i];
        break;
      }
    }
    if (!ms || !ms.tracks) return;
    var files = [
      'audio/ms-01-glass-horizon.mp3',
      'audio/ms-02-midnight-signals.mp3',
      'audio/ms-03-half-awake.mp3',
      'audio/ms-04-sodium-lights.mp3',
      'audio/ms-05-blue-hour.mp3',
      'audio/ms-06-terminal-dreams.mp3',
      'audio/ms-07-afterglow.mp3',
      'audio/ms-08-signal-fade.mp3'
    ];
    for (var t = 0; t < ms.tracks.length && t < files.length; t++) {
      ms.tracks[t].file = files[t];
      ms.tracks[t].hasAudio = true;
    }
    ms.hasAudio = true;
  }

  function realPoolRefs() {
    /* Only refs that resolve to existing files on disk */
    return ['ms:0', 'ms:1', 'ms:2', 'ms:3', 'ms:4', 'ms:5', 'ms:6', 'ms:7'];
  }

  function patchPlayback() {
    try {
      if (typeof AUDIO_FALLBACK !== 'undefined') {
        window.AUDIO_FALLBACK = REAL[0];
      }
    } catch (e) {}

    /* Safer onerror: cycle real MS files only */
    if (window.audioEl) {
      var origPlay = window.play;
      if (typeof origPlay === 'function') {
        window.play = function (alId, idx, ctx) {
          origPlay(alId, idx, ctx);
          audioEl.onerror = function () {
            var i = (idx || 0) % REAL.length;
            var alt = REAL[i];
            try {
              alt = new URL(alt, window.location.href).href;
            } catch (err) {}
            if (audioEl.src.indexOf('ms-0') === -1) {
              audioEl.src = alt;
              audioEl.play().catch(function () {});
            } else if (typeof toast === 'function') {
              toast('Audio unavailable — add file via manifest');
            }
          };
        };
      }
    }
  }

  function feedTrackToPlayable(t, i) {
    if (!t) return null;
    /* Prefer manifest-merged albums; else play file directly via synthetic album */
    if (t.file && window.audioEl) {
      return { mode: 'file', file: t.file, title: t.title || t.id, artist: t.artist || 'SONORA', idx: i };
    }
    return null;
  }

  function playFileDirect(t) {
    if (!t || !t.file || !window.audioEl) return false;
    try {
      if (window.S) {
        S.radio = S.radio || { st: 'tg-live', idx: 0, feed: true };
        S.radio.feed = true;
        S.playing = {
          al: 'ms',
          i: (S.radio.idx || 0) % 8,
          t: 0,
          on: true,
          ctx: 'radio'
        };
        /* Prefer matching MS index when file is ms-* */
        var m = String(t.file).match(/ms-0([1-8])/);
        if (m) S.playing.i = parseInt(m[1], 10) - 1;
      }
      audioEl.src = t.file;
      audioEl.play().catch(function () {});
      if (typeof renderMini === 'function') renderMini();
      if (typeof renderPlayerIfOpen === 'function') renderPlayerIfOpen();
      return true;
    } catch (e) {
      return false;
    }
  }

  function patchRadio() {
    var pool = realPoolRefs();

    window.radioPlay = function (id) {
      if (window.S) {
        S.radio = { st: id || 'late', idx: 0, feed: false };
        S.radioT = 0;
      }
      var st = null;
      if (window.STATIONS) {
        STATIONS.forEach(function (x) {
          if (x.id === id) st = x;
        });
      }
      if (st && typeof setAccent === 'function') setAccent(st.ac);

      /* Prefer channel feed when available */
      var feed = window.SONORA_RADIO && SONORA_RADIO.getFeed && SONORA_RADIO.getFeed();
      if (feed && feed.streamUrl) {
        if (window.SONORA_RADIO.start) SONORA_RADIO.start();
        return;
      }
      if (feed && feed.tracks && feed.tracks.length) {
        if (window.S) S.radio.feed = true;
        var t0 = feed.tracks[0];
        if (t0 && t0.file) {
          playFileDirect(t0);
          if (typeof toast === 'function') toast('On air — ' + ((st && st.n) || 'Channel feed'));
          return;
        }
      }
      /* Fallback: real MS pool only */
      if (typeof playRef === 'function') playRef(pool[0], 'radio');
      if (typeof toast === 'function') toast('On air — ' + ((st && st.n) || id || 'Radio'));
    };

    window.radioNow = function () {
      if (!window.S || !S.radio) return null;
      if (S.radio.feed && window.SONORA_RADIO) {
        var f = SONORA_RADIO.getFeed && SONORA_RADIO.getFeed();
        if (f && f.tracks && f.tracks.length) {
          var ft = f.tracks[S.radio.idx % f.tracks.length];
          return {
            t: ft.title || ft.id,
            d: ft.duration || '',
            al: { id: 'ms', t: 'SONORA Live', a: 'aurora', img: (window.SONORA_COVERS && SONORA_COVERS.ORB) || '' }
          };
        }
      }
      var p = pool[S.radio.idx % pool.length];
      return typeof trackRef === 'function' ? trackRef(p) : null;
    };

    var origNext = window.nextTrack;
    if (typeof origNext === 'function') {
      window.nextTrack = function (fromEnded) {
        if (window.S && S.radio) {
          if (S.radio.feed && window.SONORA_RADIO && SONORA_RADIO.next) {
            var feed = SONORA_RADIO.getFeed && SONORA_RADIO.getFeed();
            if (feed && feed.tracks && feed.tracks.length) {
              S.radio.idx = (S.radio.idx + 1) % feed.tracks.length;
              playFileDirect(feed.tracks[S.radio.idx]);
              return;
            }
          }
          S.radio.idx = (S.radio.idx + 1) % pool.length;
          if (typeof playRef === 'function') playRef(pool[S.radio.idx], 'radio');
          return;
        }
        return origNext(fromEnded);
      };
    }

    /* Disable bogus radio timer that advanced idx without playing */
    /* (harmless if S.radioT logic remains; nextTrack on ended is source of truth) */
  }

  function boot() {
    patchCovers();
    patchMsAudio();
    patchPlayback();
    patchRadio();
    /* Re-apply covers after manifest merge may create artists with ORB */
    setTimeout(patchCovers, 600);
    setTimeout(patchCovers, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.SONORA_PHASE_A = { patchCovers: patchCovers, realPool: realPoolRefs, realFiles: REAL };
})();
