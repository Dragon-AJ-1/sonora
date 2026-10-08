/**
 * Instant Radio page
 * - No 800ms wait before live UI
 * - Safe station label (fixes crash when st is tg-live / artist-*)
 * - Feed load shows spinner ON the page, does not block navigation
 */
(function () {
  'use strict';

  function stationName(id) {
    if (!id || !window.STATIONS) return 'SONORA Live';
    for (var i = 0; i < STATIONS.length; i++) {
      if (STATIONS[i].id === id) return STATIONS[i].n;
    }
    if (String(id).indexOf('artist-') === 0) return 'Artist Radio';
    if (id === 'tg-live') return 'Channel Feed';
    return 'Live';
  }

  function safeRadioNow() {
    try {
      if (typeof radioNow === 'function') return radioNow();
    } catch (e) {}
    return null;
  }

  /** Patch broken ON AIR block after render (app.js assumes station always exists) */
  function fixOnAirBlock() {
    if (!window.S || S.page !== 'radio' || !S.radio) return;
    var view = document.getElementById('view');
    if (!view) return;

    /* If page is empty/broken due to throw, rebuild minimal shell */
    if (!view.querySelector('.sec') && !view.querySelector('.wrap')) {
      view.innerHTML =
        '<div class="wrap" style="padding-top:110px">' +
        '<span class="mn"><span class="ac">RADIO</span></span>' +
        '<h1 class="serif" style="font-size:clamp(36px,5vw,64px);font-weight:400;margin-top:10px">SONORA Radio.</h1>' +
        '</div><section class="sec" style="padding-top:26px"><div class="wrap" id="radioShell"></div></section>';
    }

    var onAir = view.querySelector('[data-radio-onair]');
    var firstSec = view.querySelector('.sec .wrap') || view.querySelector('.sec') || view;
    if (!onAir && S.radio) {
      var now = safeRadioNow();
      var title = now && now.t ? now.t : 'Loading…';
      var sub =
        now && now.al && window.artist
          ? (function () {
              try {
                return artist(now.al.a).name;
              } catch (e) {
                return '';
              }
            })()
          : stationName(S.radio.st);
      var bar = document.createElement('div');
      bar.setAttribute('data-radio-onair', '1');
      bar.style.cssText =
        'border:1px solid var(--acc);border-radius:14px;padding:18px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:28px';
      bar.innerHTML =
        '<span class="mn"><span class="ac">ON AIR</span> — ' +
        stationName(S.radio.st).toUpperCase() +
        '</span>' +
        '<div style="flex:1;min-width:160px"><div style="font-weight:600">' +
        title +
        '</div><div style="font-size:12px;color:var(--ink2)">' +
        sub +
        '</div></div>' +
        '<button class="ibtn fill" data-a="radio-stop" aria-label="Stop">■</button>';
      if (firstSec.firstChild) firstSec.insertBefore(bar, firstSec.firstChild);
      else firstSec.appendChild(bar);
    }
  }

  function injectLiveShell() {
    if (!window.S || S.page !== 'radio') return;
    var view = document.getElementById('view');
    if (!view) return;

    fixOnAirBlock();

    var box = view.querySelector('[data-live-radio]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-live-radio', '1');
      box.style.cssText =
        'max-width:1440px;margin:0 auto;padding:0 clamp(16px,3.4vw,44px) 20px';
      box.innerHTML =
        '<div class="radio-live-card">' +
        '<div class="radio-live-top">' +
        '<span class="mn ac">CHANNEL FEED</span>' +
        '<span id="radioLoadHint" class="radio-load-hint">Checking feed…</span>' +
        '</div>' +
        '<div class="radio-live-actions">' +
        '<button type="button" class="btn solid" id="btnLiveRadio">▶ Play feed</button>' +
        '<a class="btn" href="https://t.me/MrA_Music" target="_blank" rel="noopener">Channel</a>' +
        '</div>' +
        '<div id="radioTicker"></div>' +
        '</div>';
      var anchor =
        view.querySelector('[data-radio-onair]') ||
        view.querySelector('.sec') ||
        view.querySelector('.wrap') ||
        view;
      if (anchor.parentNode && anchor !== view) {
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
      } else {
        view.insertBefore(box, view.firstChild);
      }

      var btn = document.getElementById('btnLiveRadio');
      if (btn) {
        btn.addEventListener('click', function () {
          setLoadHint('Starting…');
          if (window.SONORA_RADIO && SONORA_RADIO.start) SONORA_RADIO.start();
          else if (typeof radioPlay === 'function') radioPlay('late');
          setTimeout(function () {
            setLoadHint('');
            fixOnAirBlock();
          }, 300);
        });
      }
    }

    /* Load feed without blocking — update hint when done */
    setLoadHint('Checking feed…');
    var p =
      window.SONORA_RADIO && SONORA_RADIO.load
        ? SONORA_RADIO.load()
        : Promise.resolve(null);
    Promise.resolve(p)
      .then(function (feed) {
        var n =
          feed && feed.tracks && feed.tracks.length
            ? feed.tracks.length
            : window.SONORA_RADIO && SONORA_RADIO.getFeed
              ? ((SONORA_RADIO.getFeed() || {}).tracks || []).length
              : 0;
        if (n) setLoadHint(n + ' tracks ready');
        else setLoadHint('Library mix ready');
        if (window.SONORA_RADIO && SONORA_RADIO.renderTicker) SONORA_RADIO.renderTicker();
        if (window.SONORA_LIVE_VC && SONORA_LIVE_VC.refresh) SONORA_LIVE_VC.refresh();
      })
      .catch(function () {
        setLoadHint('Offline · using library');
      });
  }

  function setLoadHint(t) {
    var el = document.getElementById('radioLoadHint');
    if (el) el.textContent = t || '';
  }

  function patchNavRender() {
    if (window.__radioFastPatched) return;
    window.__radioFastPatched = true;

    if (typeof window.render === 'function') {
      var orig = window.render;
      window.render = function () {
        try {
          orig.apply(this, arguments);
        } catch (err) {
          console.warn('render error', err);
          if (window.S && S.page === 'radio') {
            var view = document.getElementById('view');
            if (view) {
              view.innerHTML =
                '<div class="wrap" style="padding-top:110px"><span class="mn ac">RADIO</span>' +
                '<h1 class="serif" style="font-size:clamp(36px,5vw,64px);font-weight:400;margin-top:10px">SONORA Radio.</h1>' +
                '<p class="it" style="color:var(--ink2)">Live channel feed & stations.</p></div>' +
                '<section class="sec"><div class="wrap"></div></section>';
            }
          }
        }
        if (window.S && S.page === 'radio') {
          /* Immediate, same frame — no setTimeout(800) */
          injectLiveShell();
        }
      };
    }

    if (typeof window.nav === 'function') {
      var origNav = window.nav;
      window.nav = function (p, param) {
        origNav(p, param);
        if (p === 'radio') injectLiveShell();
      };
    }
  }

  function boot() {
    patchNavRender();
    /* Preload feed in background so first Play is instant */
    if (window.SONORA_RADIO && SONORA_RADIO.load) SONORA_RADIO.load();
    if (window.S && S.page === 'radio') injectLiveShell();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SONORA_RADIO_FAST = { inject: injectLiveShell, stationName: stationName };
})();
