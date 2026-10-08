/**
 * SONORA Live Voice-Chat detector
 *
 * Reality: Telegram Voice Chat / livestream audio CANNOT be played inside a
 * normal website <audio> element. Bot API has no stream URL for VC audio.
 *
 * What we do:
 *  - Poll audio/live-status.json (updated by GitHub Action from Telegram)
 *  - If live: show ON AIR banner + open Telegram deep link to join VC
 *  - Meanwhile radio continues with channel feed / library tracks
 */
(function () {
  'use strict';

  var status = { live: false, title: '', link: 'https://t.me/MrA_Music', updatedAt: null };
  var banner = null;

  function loadStatus() {
    if (!window.fetch) return Promise.resolve(status);
    return fetch('audio/live-status.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) return status;
        return r.json();
      })
      .then(function (d) {
        if (d && typeof d === 'object') {
          status.live = !!d.live;
          status.title = d.title || 'Channel voice chat';
          status.link = d.link || 'https://t.me/MrA_Music';
          status.updatedAt = d.updatedAt || null;
          status.note = d.note || '';
        }
        return status;
      })
      .catch(function () {
        return status;
      });
  }

  function ensureBanner() {
    if (!window.S || S.page !== 'radio') return;
    var view = document.getElementById('view');
    if (!view) return;
    banner = view.querySelector('[data-live-vc]');
    if (!banner) {
      banner = document.createElement('div');
      banner.setAttribute('data-live-vc', '1');
      banner.style.cssText =
        'max-width:1440px;margin:0 auto;padding:0 clamp(16px,3.4vw,44px) 12px';
      var host = view.querySelector('[data-live-radio]') || view.querySelector('.sec') || view;
      host.parentNode.insertBefore(banner, host);
    }
    renderBanner();
  }

  function renderBanner() {
    if (!banner) return;
    if (status.live) {
      banner.innerHTML =
        '<div style="border:1px solid var(--acc);background:rgba(217,164,65,0.08);border-radius:14px;padding:16px 20px;display:flex;flex-wrap:wrap;gap:14px;align-items:center">' +
        '<span class="mn" style="color:var(--acc)">● LIVE VOICE CHAT</span>' +
        '<span style="flex:1;min-width:180px;font-size:14px;color:var(--ink2)">' +
        (status.title || 'Channel is live') +
        ' — open Telegram to listen. Browsers cannot stream Telegram voice-chat audio directly.</span>' +
        '<a class="btn solid" href="' +
        status.link +
        '" target="_blank" rel="noopener" style="text-decoration:none">Join in Telegram</a>' +
        '</div>';
    } else {
      banner.innerHTML =
        '<div style="border:1px solid var(--line);border-radius:14px;padding:14px 18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center">' +
        '<span class="mn" style="color:var(--mut)">VOICE CHAT</span>' +
        '<span style="flex:1;font-size:13px;color:var(--ink2)">No live voice chat right now. Playing channel music feed instead.</span>' +
        '<a class="btn" href="https://t.me/MrA_Music" target="_blank" rel="noopener" style="text-decoration:none">Open channel</a>' +
        '</div>';
    }
  }

  function refresh() {
    return loadStatus().then(function () {
      ensureBanner();
      renderBanner();
    });
  }

  var obs = new MutationObserver(function () {
    if (window.S && S.page === 'radio') ensureBanner();
  });

  function boot() {
    var v = document.getElementById('view');
    if (v) obs.observe(v, { childList: true, subtree: true });
    refresh();
    setInterval(function () {
      if (window.S && S.page === 'radio') refresh();
    }, 45000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SONORA_LIVE_VC = { refresh: refresh, getStatus: function () { return status; } };
})();
