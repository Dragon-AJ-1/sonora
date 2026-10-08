/**
 * SONORA Phase A — stability layer (GitHub Pages)
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
    return typeof u === 'string' && /^https?:\/\//i.test(u) && u.indexOf('github.io') < 0 && u.indexOf('localhost') < 0;
  }

  function C(key) {
    if (window.SONORA_COVERS && SONORA_COVERS[key]) return SONORA_COVERS[key];
    if (window.IMG && IMG[key]) return IMG[key];
    return '';
  }

  function patchCovers() {
    if (window.IMG && window.SONORA_COVERS) {
      Object.keys(SONORA_COVERS).forEach(function (k) {
        IMG[k] = SONORA_COVERS[k];
      });
    }
    if (window.ARTISTS) {
      var amap = {
        aurora: C('AUR'),
        nia: C('NIA'),
        sora: C('SORA'),
        kairo: C('KAIRO'),
        milo: C('MILO'),
        elias: C('ELIAS'),
        vera: C('VERA')
      };
      Object.keys(ARTISTS).forEach(function (id) {
        var a = ARTISTS[id];
        if (!a) return;
        a.img = amap[id] || C('ORB');
      });
    }
    if (window.ALBUMS) {
      var albumMap = {
        ms: C('MS'),
        gs: C('NIA'),
        nr: C('SORA'),
        bt: C('KAIRO'),
        ns: C('MILO'),
        fa: C('ELIAS'),
        pc: C('PC'),
        vh: C('VERA'),
        ws: C('WS')
      };
      ALBUMS.forEach(function (al) {
        if (!al) return;
        al.img = albumMap[al.id] || C('ORB');
      });
    }
    function forceOrb(arr) {
      if (!arr) return;
      arr.forEach(function (item) {
        if (!item) return;
        if (isExternal(item.img) || !item.img) item.img = C('ORB');
      });
    }
    forceOrb(window.PLAYLISTS);
    forceOrb(window.STORIES);
    forceOrb(window.EVENTS);
    forceOrb(window.SESSIONS);
  }

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
    for (var t = 0; t < ms.tracks.length && t < REAL.length; t++) {
      ms.tracks[t].file = REAL[t];
      ms.tracks[t].hasAudio = true;
    }
    ms.hasAudio = true;
  }

  function realPoolRefs() {
    return ['ms:0', 'ms:1', 'ms:2', 'ms:3', 'ms:4', 'ms:5', 'ms:6', 'ms:7'];
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
            al: { id: 'ms', t: 'SONORA Live', a: 'aurora', img: C('ORB') }
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
  }

  function boot() {
    patchCovers();
    patchMsAudio();
    patchRadio();
    setTimeout(patchCovers, 400);
    setTimeout(patchCovers, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.SONORA_PHASE_A = { patchCovers: patchCovers, realPool: realPoolRefs, realFiles: REAL };
})();
