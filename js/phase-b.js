/**
 * SONORA Phase B (start) — Media Session + sleep timer fade
 * Keeps payload light; no accounts / no heavy deps.
 */
(function () {
  'use strict';

  function nowMeta() {
    try {
      if (!window.S || !S.playing || !S.playing.al) return null;
      var al = album(S.playing.al);
      var tr = al.tracks[S.playing.i] || {};
      var ar = artist(al.a);
      return {
        title: tr.t || 'SONORA',
        artist: ar.name || '',
        album: al.t || '',
        artwork: al.img
          ? [{ src: al.img, sizes: '400x400', type: 'image/svg+xml' }]
          : []
      };
    } catch (e) {
      return null;
    }
  }

  function bindMediaSession() {
    if (!('mediaSession' in navigator) || !window.audioEl) return;
    function update() {
      var m = nowMeta();
      if (!m) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata(m);
        navigator.mediaSession.playbackState = S.playing.on ? 'playing' : 'paused';
      } catch (e) {}
    }
    try {
      navigator.mediaSession.setActionHandler('play', function () {
        audioEl.play().catch(function () {});
      });
      navigator.mediaSession.setActionHandler('pause', function () {
        audioEl.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', function () {
        if (typeof prevTrack === 'function') prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', function () {
        if (typeof nextTrack === 'function') nextTrack();
      });
    } catch (e) {}
    audioEl.addEventListener('play', update);
    audioEl.addEventListener('pause', update);
    setInterval(update, 4000);
    update();
  }

  /** Sleep fade: last 12s reduce volume smoothly then pause */
  var fading = false;
  setInterval(function () {
    if (!window.S || !S.sleep || S.sleep <= 0) {
      fading = false;
      return;
    }
    if (S.sleep <= 12 && S.playing && S.playing.on && window.audioEl && !fading) {
      fading = true;
      var start = audioEl.volume;
      var steps = 24;
      var i = 0;
      var t = setInterval(function () {
        i++;
        audioEl.volume = Math.max(0, start * (1 - i / steps));
        if (i >= steps) {
          clearInterval(t);
          try {
            audioEl.pause();
          } catch (e) {}
          S.playing.on = false;
          S.sleep = 0;
          audioEl.volume = S.muted ? 0 : S.volume;
          fading = false;
          if (typeof toast === 'function') toast('Sleep timer — faded out');
          if (typeof renderMini === 'function') renderMini();
        }
      }, 500);
    }
  }, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(bindMediaSession, 400);
    });
  } else {
    setTimeout(bindMediaSession, 400);
  }

  window.SONORA_PHASE_B = { bindMediaSession: bindMediaSession };
})();
