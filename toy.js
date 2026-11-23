// Dumb Terminal's site, part 2: the [ trackpad ] toy (under man dumbterminal) and two small ambient touches. Decoration only:
// hidden from screen readers, and the ambient bits stay still with Reduce Motion.
(function () {
  'use strict';
  var DT = window.DT || { still: function () { return false; } };

  // ---- The trackpad moves the pointer on the tiny Mac; a tap clicks the window under it. ----
  var pad = document.querySelector('.pad');
  var desk = document.querySelector('.mini-desk');
  var pointer = document.querySelector('.mini-pointer');
  if (pad && desk && pointer) {
    var pos = { x: 0.5, y: 0.5 };
    var last = null;
    var moved = 0;
    var place = function () {
      pointer.style.left = (pos.x * 100) + '%';
      pointer.style.top = (pos.y * 100) + '%';
    };
    var clickAt = function () {
      var box = desk.getBoundingClientRect();
      var x = box.left + pos.x * box.width;
      var y = box.top + pos.y * box.height;
      var hit = null;
      desk.querySelectorAll('.win').forEach(function (w) {
        var r = w.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          if (!hit || +getComputedStyle(w).zIndex > +getComputedStyle(hit).zIndex) hit = w;
        }
      });
      if (!hit) return;
      var top = 0;
      desk.querySelectorAll('.win').forEach(function (w) { top = Math.max(top, +getComputedStyle(w).zIndex || 0); w.classList.remove('front'); });
      hit.style.zIndex = top + 1;
      hit.classList.add('front');
    };
    // Relative movement, like a real trackpad: the pointer moves by how far the finger moves.
    pad.addEventListener('pointerdown', function (e) {
      last = { x: e.clientX, y: e.clientY };
      moved = 0;
      pad.classList.add('active');
      if (pad.setPointerCapture) pad.setPointerCapture(e.pointerId);
    });
    pad.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' && !last) last = { x: e.clientX, y: e.clientY };
      if (!last) return;
      var r = pad.getBoundingClientRect();
      var dx = (e.clientX - last.x) / r.width;
      var dy = (e.clientY - last.y) / r.height;
      moved += Math.abs(dx) + Math.abs(dy);
      pos.x = Math.min(0.97, Math.max(0.01, pos.x + dx * 1.2));
      pos.y = Math.min(0.95, Math.max(0.01, pos.y + dy * 1.2));
      last = { x: e.clientX, y: e.clientY };
      place();
    });
    var end = function (e) {
      if (e.type === 'pointerup' && moved < 0.03) clickAt();
      if (e.pointerType !== 'mouse' || e.type === 'pointerleave') last = null;
      pad.classList.remove('active');
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('pointerleave', end);
    place();
  }

  // ---- Ambient: the headline's cursor leans a few pixels toward the pointer, and letters near the pointer
  // brighten for a moment. Only with a mouse and motion on. ----
  var fine = window.matchMedia('(pointer: fine)').matches;
  var h1 = document.querySelector('.hero h1');
  if (fine && h1 && !DT.still()) {
    var cursor = h1.querySelector('.cursor');
    // Wrap the headline's letters so each can glow. The text stays one string for screen readers.
    var text = h1.firstChild;
    if (text && text.nodeType === 3) {
      var label = text.textContent;
      var spoken = document.createElement('span');
      spoken.className = 'sr-only';
      spoken.textContent = label;
      h1.insertBefore(spoken, text);
      var wrap = document.createElement('span');
      wrap.setAttribute('aria-hidden', 'true');
      label.split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        wrap.appendChild(s);
      });
      h1.replaceChild(wrap, text);
    }
    var letters = h1.querySelectorAll('.ch');
    var pending = false;
    window.addEventListener('pointermove', function (e) {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (cursor) {
          var c = cursor.getBoundingClientRect();
          var shift = Math.max(-4, Math.min(4, (e.clientX - (c.left + c.width / 2)) / 60));
          cursor.style.transform = 'translateX(' + shift.toFixed(1) + 'px)';
        }
        var box = h1.getBoundingClientRect();
        if (e.clientY < box.top - 60 || e.clientY > box.bottom + 60) return;
        letters.forEach(function (l) {
          var r = l.getBoundingClientRect();
          var d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY);
          if (d < 46) {
            l.classList.add('lit');
            clearTimeout(l._t);
            l._t = setTimeout(function () { l.classList.remove('lit'); }, 380);
          }
        });
      });
    }, { passive: true });
  }
})();
