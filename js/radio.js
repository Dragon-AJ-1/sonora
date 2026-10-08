/**
 * SONORA Radio — lightweight continuous player for GitHub Pages
 *
 * - Loads audio/radio-feed.json (kept small, updated by Telegram bot)
 * - Plays tracks in order, loops, cross-station via STATIONS still works
 * - Optional streamUrl (HLS/Icecast) if you host audio elsewhere
 * - On-air text messages from the channel shown as a live ticker
 * - No accounts, no heavy deps
 */
(function () {
  'use strict';

  var feed = null;
  var feedIdx = 0;
  var tickerEl = null;
  var loaded = false;

  function loadFeed() {
    if (!window.fetch) return Promise.resolve(null);
    return fetch('audio/radio-feed.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
      .then(function (d) {
        feed = d;
        loaded = true;
        return d;
      })
      .catch(function () {
        loaded = true;
        return null;
      });
  }

  function hasFeedTracks() {
    return feed && feed.tracks && feed.tracks.length > 0;
  }

  function currentFeedTrack() {
    if (!hasFeedTracks()) return null;
    return feed.tracks[feedIdx % feed.tracks.length];
  }

  function playFeedTrack(i) {
    if (!hasFeedTracks()) return false;
    feedIdx = ((i % feed.tracks.length) + feed.tracks.length) % feed.tracks.length;
    var t = feed.tracks[feedIdx];
    if (!t || !t.file) return false;

    // Hook into main app state if available
    try {
      if (window.S) {
        S.radio = S.radio || { st: 'tg-live', idx: feedIdx, feed: true };
        S.radio.idx = feedIdx;
        S.radio.feed = true;
        S.playing.ctx = 'radio';
      }
      var el = window.audioEl || document.querySelector('audio');
      // Prefer app play path when possible
      if (typeof window.playManifestFile === 'function') {
        window.playManifestFile(t);
        return true;
      }
      // Direct fallback
      if (window.audioEl) {
        audioEl.src = t.file;
        audioEl.play().catch(function () {});
        if (window.S) {
          S.playing.on = true;
          S.playing.t = 0;
        }
        try {
          if (typeof renderMini === 'function') renderMini();
        } catch (e) {}
        return true;
      }
    } catch (e) {}
    return false;
  }

  function nextFeed() {
    if (!hasFeedTracks()) return;
    playFeedTrack(feedIdx + 1);
  }

  function startLiveRadio() {
    loadFeed().then(function () {
      if (feed && feed.streamUrl) {
        // External real stream (HLS/Icecast) — only if user hosts one
        try {
          if (window.audioEl) {
            audioEl.src = feed.streamUrl;
            audioEl.play().catch(function () {});
            if (window.S) {
              S.radio = { st: 'tg-live', idx: 0, feed: true, stream: true };
              S.playing.ctx = 'radio';
              S.playing.on = true;
            }
            if (typeof toast === 'function') toast('Live stream connected');
            if (typeof renderMini === 'function') renderMini();
          }
        } catch (e) {}
        return;
      }
      if (hasFeedTracks()) {
        playFeedTrack(0);
        if (typeof toast === 'function') toast('SONORA Live — channel feed');
      } else if (typeof radioPlay === 'function') {
        // Fall back to demo station pools
        radioPlay('late');
      }
      renderTicker();
    });
  }

  function renderTicker() {
    var host = document.getElementById('radioTicker');
    if (!host) return;
    var msgs =
      feed && feed.messages && feed.messages.length
        ? feed.messages
        : [{ t: 'SONORA Radio — drop audio in the channel to fill the feed.' }];
    host.innerHTML = msgs
      .slice(-8)
      .map(function (m) {
        return (
          '<div class="radio-msg"><span class="mn">ON AIR</span><span>' +
          String(m.t || '').replace(/</g, '<') +
          '</span></div>'
        );
      })
      .join('');
  }

  // When a track ends during feed radio, advance
  document.addEventListener(
    'SONORA_TRACK_ENDED',
    function () {
      if (window.S && S.radio && S.radio.feed && !S.radio.stream) nextFeed();
    },
    false
  );

  // Also patch native ended if app uses audioEl
  function wireEnded() {
    if (!window.audioEl || audioEl._radioWired) return;
    audioEl._radioWired = true;
    audioEl.addEventListener('ended', function () {
      if (window.S && S.radio && S.radio.feed && !S.radio.stream) {
        nextFeed();
      }
    });
  }

  window.SONORA_RADIO = {
    load: loadFeed,
    start: startLiveRadio,
    next: nextFeed,
    getFeed: function () {
      return feed;
    },
    renderTicker: renderTicker,
    wire: wireEnded
  };

  // Boot: preload feed quietly
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadFeed();
      setTimeout(wireEnded, 500);
    });
  } else {
    loadFeed();
    setTimeout(wireEnded, 500);
  }
})();
