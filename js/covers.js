/**
 * SONORA covers — local data-URI SVG art (no external CDN)
 * Replaces qwenlm.ai dependencies with deterministic gradients.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/"/g, '"');
  }

  function svgCover(opts) {
    opts = opts || {};
    var c1 = opts.c1 || '#1a1612';
    var c2 = opts.c2 || '#3d3428';
    var accent = opts.accent || '#D9A441';
    var label = opts.label || 'SONORA';
    var sub = opts.sub || '';
    var seed = opts.seed || 0;
    var x1 = 20 + (seed % 40);
    var y1 = 30 + ((seed * 7) % 50);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="' +
      c1 +
      '"/><stop offset="100%" stop-color="' +
      c2 +
      '"/></linearGradient>' +
      '<radialGradient id="r" cx="' +
      x1 +
      '%" cy="' +
      y1 +
      '%" r="70%">' +
      '<stop offset="0%" stop-color="' +
      accent +
      '" stop-opacity="0.35"/>' +
      '<stop offset="100%" stop-color="' +
      accent +
      '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="400" height="400" fill="url(#g)"/>' +
      '<rect width="400" height="400" fill="url(#r)"/>' +
      '<circle cx="200" cy="175" r="54" fill="none" stroke="' +
      accent +
      '" stroke-width="1.5" opacity="0.85"/>' +
      '<circle cx="200" cy="175" r="18" fill="' +
      accent +
      '" opacity="0.9"/>' +
      '<text x="200" y="280" text-anchor="middle" fill="#F2EEE6" font-family="Georgia, serif" font-size="22" opacity="0.92">' +
      esc(label) +
      '</text>' +
      (sub
        ? '<text x="200" y="308" text-anchor="middle" fill="#F2EEE6" font-family="monospace" font-size="11" opacity="0.45" letter-spacing="2">' +
          esc(sub).toUpperCase() +
          '</text>'
        : '') +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var COVERS = {
    MS: svgCover({ c1: '#0d0c0b', c2: '#2a241c', accent: '#6C8CFF', label: 'Midnight Signals', sub: '2026', seed: 1 }),
    AUR: svgCover({ c1: '#12101a', c2: '#2a2540', accent: '#6C8CFF', label: 'Aurora Vale', sub: 'Lisbon', seed: 2 }),
    NIA: svgCover({ c1: '#1a1208', c2: '#3d2e14', accent: '#D8A24A', label: 'Nia Sol', sub: 'London', seed: 3 }),
    SORA: svgCover({ c1: '#1a1014', c2: '#3a2430', accent: '#D98BA6', label: 'Sora June', sub: 'Tokyo', seed: 4 }),
    KAIRO: svgCover({ c1: '#1a0e08', c2: '#3d2418', accent: '#E07A4F', label: 'Kairo Bloom', sub: 'Accra / Berlin', seed: 5 }),
    MILO: svgCover({ c1: '#0e1410', c2: '#1e2e24', accent: '#8FA98A', label: 'Milo North', sub: 'Oslo', seed: 6 }),
    ELIAS: svgCover({ c1: '#0c1216', c2: '#1a2a32', accent: '#7FA6B8', label: 'Elias Grey', sub: 'Reykjavík', seed: 7 }),
    VERA: svgCover({ c1: '#160c0c', c2: '#2e1818', accent: '#B84A4A', label: 'Vera Lune', sub: 'Paris', seed: 8 }),
    PC: svgCover({ c1: '#12100e', c2: '#2a2420', accent: '#D9A441', label: 'Paper Cities', sub: '2023', seed: 9 }),
    WS: svgCover({ c1: '#0e1210', c2: '#1c2820', accent: '#8FA98A', label: 'Winter Songs', sub: 'EP', seed: 10 }),
    STUDIO: svgCover({ c1: '#0a0908', c2: '#1e1a15', accent: '#D9A441', label: 'Studio', sub: 'SONORA', seed: 11 }),
    TOKYO: svgCover({ c1: '#100e16', c2: '#241e32', accent: '#D98BA6', label: 'Tokyo', sub: 'After midnight', seed: 12 }),
    CLUB: svgCover({ c1: '#12080e', c2: '#2a1420', accent: '#E07A4F', label: 'Club', sub: 'Live', seed: 13 }),
    TAPE: svgCover({ c1: '#12100c', c2: '#2a2418', accent: '#D9A441', label: 'Tape', sub: 'Analog', seed: 14 }),
    SESSION: svgCover({ c1: '#0c0e12', c2: '#1a222c', accent: '#6C8CFF', label: 'Sessions', sub: '018', seed: 15 }),
    ORB: svgCover({ c1: '#0A0908', c2: '#1E1A15', accent: '#D9A441', label: 'SONORA', sub: 'Listen deeper', seed: 0 }),
    HALL: svgCover({ c1: '#0e0c0a', c2: '#221c16', accent: '#A8A297', label: 'Hall', sub: 'Classical', seed: 16 })
  };

  window.SONORA_COVERS = COVERS;
  window.sonoraCover = svgCover;

  /* Patch IMG on data layer if already loaded */
  function apply() {
    if (!window.IMG) return;
    Object.keys(COVERS).forEach(function (k) {
      IMG[k] = COVERS[k];
    });
    /* Re-point artist / album images that still use external hosts */
    if (window.ARTISTS) {
      Object.keys(ARTISTS).forEach(function (id) {
        var a = ARTISTS[id];
        if (!a || !a.img) return;
        if (String(a.img).indexOf('http') === 0) {
          var map = {
            aurora: COVERS.AUR,
            nia: COVERS.NIA,
            sora: COVERS.SORA,
            kairo: COVERS.KAIRO,
            milo: COVERS.MILO,
            elias: COVERS.ELIAS,
            vera: COVERS.VERA
          };
          a.img = map[id] || COVERS.ORB;
        }
      });
    }
    if (window.ALBUMS) {
      ALBUMS.forEach(function (al) {
        if (al && al.img && String(al.img).indexOf('http') === 0) {
          al.img = COVERS.ORB;
        }
      });
    }
  }

  apply();
  window.SONORA_COVERS_APPLY = apply;
})();
