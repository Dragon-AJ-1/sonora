/**
 * SONORA Radio — feed player (non-blocking load)
 */
(function () {
  'use strict';

  var feed = null;
  var feedIdx = 0;
  var loaded = false;
  var loading = null;

  function loadFeed() {
    if (loaded && feed) return Promise.resolve(feed);
    if (loading) return loading;
    if (!window.fetch) {
      loaded = true;
      return Promise.resolve(null);
    }
    loading = fetch('audio/radio-feed.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
      .then(function (d) {
        feed = d;
        loaded = true;
        loading = null;
        return d;
      })
      .catch(function () {
        loaded = true;
        loading = null;
        return null;
      });
    return loading;
  }

  function hasFeedTracks() {
    return feed && feed.tracks && feed.tracks.length > 0;
  }

  function playFeedTrack(i) {
    if (!hasFeedTracks()) return false;
    feedIdx = ((i % feed.tracks.length) + feed.tracks.length) % feed.tracks.length;
    var t = feed.tracks[feedIdx];
    if (!t || !t.file) return false;

    try {
      if (window.S) {
        /* Use a real STATIONS id so pgRadio ON AIR block never crashes */
        S.radio = S.radio || { st: 'late', idx: feedIdx, feed: true };
        S.radio.st = S.radio.st || 'late';
        if (S.radio.st === 'tg-live') S.radio.st = 'late';
        S.radio.idx = feedIdx;
        S.radio.feed = true;
        if (!S.playing) S.playing = { al: 'ms', i: 0, t: 0, on: true, ctx: 'radio' };
        S.playing.ctx = 'radio';
        S.playing.on = true;
      }
      if (window.audioEl) {
        audioEl.src = t.file;
        audioEl.play().catch(function () {});
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
    /* Do not block UI — resolve feed then play */
    loadFeed().then(function () {
      if (feed && feed.streamUrl) {
        try {
          if (window.audioEl) {
            audioEl.src = feed.streamUrl;
            audioEl.play().catch(function () {});
            if (window.S) {
              S.radio = { st: 'late', idx: 0, feed: true, stream: true };
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
        radioPlay('late');
      }
      renderTicker();
      try {
        if (typeof render === 'function' && window.S && S.page === 'radio') render();
      } catch (e) {}
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

  function wireEnded() {
    if (!window.audioEl || audioEl._radioWired) return;
    audioEl._radioWired = true;
    audioEl.addEventListener('ended', function () {
      if (window.S && S.radio && S.radio.feed && !S.radio.stream) nextFeed();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadFeed();
      setTimeout(wireEnded, 200);
    });
  } else {
    loadFeed();
    setTimeout(wireEnded, 200);
  }
})();
