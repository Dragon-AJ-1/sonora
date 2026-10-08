/**
 * SONORA Share — local library export/import (no accounts, no cloud)
 */
(function () {
  'use strict';

  var pasteOpen = false;

  function b64encode(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return '';
    }
  }
  function b64decode(str) {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (e) {
      return null;
    }
  }

  function collectPlaylistSnapshot() {
    if (!window.S) return null;
    return {
      v: 1,
      type: 'sonora-share',
      at: new Date().toISOString(),
      likes: S.likes || {},
      savedPl: S.savedPl || {},
      savedAlb: S.savedAlb || {},
      hist: (S.hist || []).slice(0, 40),
      queue: (S.queue || []).slice(0, 50)
    };
  }

  function applySnapshot(data) {
    if (!data || data.type !== 'sonora-share' || !window.S) return false;
    try {
      if (data.likes) S.likes = data.likes;
      if (data.savedPl) S.savedPl = data.savedPl;
      if (data.savedAlb) S.savedAlb = data.savedAlb;
      if (data.hist) S.hist = data.hist;
      if (data.queue) S.queue = data.queue;
      if (typeof saveState === 'function') saveState();
      if (typeof render === 'function') render();
      if (typeof renderMini === 'function') renderMini();
      if (typeof toast === 'function') toast('Imported to this device');
      closeShareModal();
      return true;
    } catch (e) {
      return false;
    }
  }

  function downloadJSON() {
    var snap = collectPlaylistSnapshot();
    if (!snap) return;
    var blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sonora-library-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
    if (typeof toast === 'function') toast('Library downloaded');
  }

  function copyShareCode() {
    var snap = collectPlaylistSnapshot();
    if (!snap) return;
    var code = 'SONORA1:' + b64encode(JSON.stringify(snap));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(
        function () {
          if (typeof toast === 'function') toast('Share code copied');
        },
        function () {
          showCodePreview(code);
        }
      );
    } else {
      showCodePreview(code);
    }
  }

  function showCodePreview(code) {
    var ta = document.getElementById('shareCodeOut');
    if (ta) {
      ta.value = code;
      ta.parentElement.style.display = 'block';
      ta.select();
    }
  }

  function importFromCode(code) {
    code = String(code || '').trim();
    if (code.indexOf('SONORA1:') === 0) code = code.slice(8);
    var raw = b64decode(code);
    if (!raw) {
      if (typeof toast === 'function') toast('Invalid share code');
      return false;
    }
    try {
      return applySnapshot(JSON.parse(raw));
    } catch (e) {
      if (typeof toast === 'function') toast('Could not read share code');
      return false;
    }
  }

  function importFromFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        applySnapshot(JSON.parse(reader.result));
      } catch (e) {
        if (typeof toast === 'function') toast('Invalid library file');
      }
    };
    reader.readAsText(file);
  }

  function closeShareModal() {
    var modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.style.display = '';
    modal.innerHTML = '';
    pasteOpen = false;
    document.body.style.overflow = '';
  }

  function openShareModal() {
    var modal = document.getElementById('modal');
    if (!modal) return;

    modal.innerHTML =
      '<div class="share-sheet" role="dialog" aria-modal="true" aria-labelledby="shareTitle">' +
      '<header class="share-head">' +
      '<div>' +
      '<div class="share-kicker">Local only</div>' +
      '<h2 id="shareTitle" class="share-title">Share library</h2>' +
      '</div>' +
      '<button type="button" class="share-x" data-share="close" aria-label="Close">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</header>' +
      '<p class="share-lead">Move likes, playlists and history between devices without an account. Everything stays on the device until you export.</p>' +
      '<div class="share-grid">' +
      '<button type="button" class="share-tile" data-share="export">' +
      '<span class="share-tile-ico" aria-hidden="true">↓</span>' +
      '<span class="share-tile-t">Download JSON</span>' +
      '<span class="share-tile-d">Full library file</span></button>' +
      '<button type="button" class="share-tile" data-share="copy">' +
      '<span class="share-tile-ico" aria-hidden="true">⎘</span>' +
      '<span class="share-tile-t">Copy code</span>' +
      '<span class="share-tile-d">Paste on another device</span></button>' +
      '<button type="button" class="share-tile" data-share="paste-toggle">' +
      '<span class="share-tile-ico" aria-hidden="true">↑</span>' +
      '<span class="share-tile-t">Import code</span>' +
      '<span class="share-tile-d">Paste a share code</span></button>' +
      '<label class="share-tile share-tile-file">' +
      '<span class="share-tile-ico" aria-hidden="true">▣</span>' +
      '<span class="share-tile-t">Import file</span>' +
      '<span class="share-tile-d">Choose a JSON export</span>' +
      '<input type="file" accept="application/json,.json" data-share="file" hidden></label>' +
      '</div>' +
      '<div id="sharePasteBox" class="share-paste" hidden>' +
      '<label class="share-paste-label" for="shareCodeIn">Share code</label>' +
      '<textarea id="shareCodeIn" class="share-input" rows="3" placeholder="SONORA1:…" spellcheck="false"></textarea>' +
      '<div class="share-paste-actions">' +
      '<button type="button" class="btn" data-share="paste-cancel">Cancel</button>' +
      '<button type="button" class="btn solid" data-share="paste-apply">Import</button>' +
      '</div></div>' +
      '<div id="shareCodeBox" class="share-paste" hidden>' +
      '<label class="share-paste-label" for="shareCodeOut">Copied code</label>' +
      '<textarea id="shareCodeOut" class="share-input" rows="3" readonly spellcheck="false"></textarea>' +
      '</div>' +
      '<p class="share-note">No cloud · no account · you control the file</p>' +
      '</div>';

    modal.classList.add('open');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    var closeBtn = modal.querySelector('[data-share="close"]');
    if (closeBtn) closeBtn.focus();
  }

  function onDocClick(e) {
    var modal = document.getElementById('modal');
    var t = e.target;

    /* Backdrop click closes */
    if (modal && modal.classList.contains('open') && t === modal) {
      closeShareModal();
      return;
    }

    var shareEl = t && t.closest && t.closest('[data-share]');
    if (!shareEl) return;

    var a = shareEl.getAttribute('data-share');
    if (a === 'open') {
      e.preventDefault();
      openShareModal();
    } else if (a === 'close') {
      e.preventDefault();
      e.stopPropagation();
      closeShareModal();
    } else if (a === 'export') {
      e.preventDefault();
      downloadJSON();
    } else if (a === 'copy') {
      e.preventDefault();
      copyShareCode();
    } else if (a === 'paste-toggle') {
      e.preventDefault();
      var box = document.getElementById('sharePasteBox');
      var out = document.getElementById('shareCodeBox');
      if (out) out.hidden = true;
      if (box) {
        box.hidden = !box.hidden;
        pasteOpen = !box.hidden;
        if (pasteOpen) {
          var inp = document.getElementById('shareCodeIn');
          if (inp) {
            inp.value = '';
            inp.focus();
          }
        }
      }
    } else if (a === 'paste-cancel') {
      e.preventDefault();
      var b = document.getElementById('sharePasteBox');
      if (b) b.hidden = true;
      pasteOpen = false;
    } else if (a === 'paste-apply') {
      e.preventDefault();
      var inp2 = document.getElementById('shareCodeIn');
      if (inp2) importFromCode(inp2.value);
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('modal');
      if (modal && modal.classList.contains('open')) {
        closeShareModal();
      }
    }
  }

  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-share') === 'file' && t.files && t.files[0]) {
      importFromFile(t.files[0]);
    }
  });

  window.SONORA_SHARE = {
    export: downloadJSON,
    copy: copyShareCode,
    importCode: importFromCode,
    importFile: importFromFile,
    open: openShareModal,
    close: closeShareModal
  };
})();
