/**
 * SONORA Share — local playlists & history, zero backend
 *
 * - Export playlist / likes / history as a small JSON file
 * - Import JSON file back into this browser
 * - Copy a compact share code (base64) others can paste
 * Everything stays on-device until the user chooses to share
 */
(function () {
  'use strict';

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
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
    if (typeof toast === 'function') toast('Library file downloaded');
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
          prompt('Copy this code:', code);
        }
      );
    } else {
      prompt('Copy this code:', code);
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
      var data = JSON.parse(raw);
      return applySnapshot(data);
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
        var data = JSON.parse(reader.result);
        applySnapshot(data);
      } catch (e) {
        if (typeof toast === 'function') toast('Invalid library file');
      }
    };
    reader.readAsText(file);
  }

  function openShareModal() {
    var modal = document.getElementById('modal');
    if (!modal) return;
    modal.innerHTML =
      '<div class="modal-card" style="max-width:480px;margin:10vh auto;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:28px 24px;position:relative">' +
      '<button data-a="mclose" style="position:absolute;right:14px;top:14px;font-size:20px;color:var(--mut)">×</button>' +
      '<div class="mn" style="color:var(--acc)">SHARE · LOCAL ONLY</div>' +
      '<h2 class="serif" style="font-size:28px;margin-top:8px;font-weight:400">Your library stays on this device.</h2>' +
      '<p style="color:var(--ink2);margin-top:12px;font-size:14px;line-height:1.55">Export a small file or a share code. Anyone can import it on their own browser — no accounts, no cloud.</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:22px">' +
      '<button class="btn solid" data-share="export" style="justify-content:center">Download library JSON</button>' +
      '<button class="btn" data-share="copy" style="justify-content:center">Copy share code</button>' +
      '<button class="btn" data-share="paste" style="justify-content:center">Paste share code</button>' +
      '<label class="btn" style="justify-content:center;cursor:pointer">Import JSON file<input type="file" accept="application/json,.json" data-share="file" hidden></label>' +
      '</div></div>';
    modal.classList.add('open');
    modal.style.display = 'block';
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-share]');
    if (!t) return;
    var a = t.getAttribute('data-share');
    if (a === 'export') downloadJSON();
    else if (a === 'copy') copyShareCode();
    else if (a === 'paste') {
      var code = prompt('Paste SONORA share code:');
      if (code) importFromCode(code);
    } else if (a === 'open') openShareModal();
  });

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
    open: openShareModal
  };
})();
