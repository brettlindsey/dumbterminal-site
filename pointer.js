// Dumb Terminal's site: what the mouse and taps do on the home page. Each visit picks one of six, never the same twice
// in a row:
//   mac     · the Mac's pointer: a fainter arrow follows yours a beat behind, parks beside the headline's blinking
//             cursor after five idle seconds, and glides to each tap or click and clicks there (a small ring).
//   packets · a dim corner line shows the six bytes Screen Sharing would send the Mac for the pointer (RFB
//             PointerEvent: type 5, buttons, x, y), lit while a button is down. Six taps: "# six bytes. ...".
//   glow    · afterglow: the pointer leaves a short phosphor trail; a tap leaves a dot that dies away.
//   wave    · a tap sends a ring of characters out, @ O o . , that fades.
//   xray    · while the pointer moves, a circle around it shows a dump of bytes "under" the page, with a few of the
//             site's secrets in it. On touch, press and hold.
//   ping    · a tap types a reply that floats away: "64 bytes from mac: seq=3 time=3.1 ms", now and then "(it misses you)".
// `?pointer=wave` picks one on purpose (scripts/site-check.mjs walks all six this way). With Reduce Motion only the two
// that don't move are picked (packets, xray). Nothing here takes clicks: every layer has pointer-events off.
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT) return;

  var still = DT.still();
  var names = ['mac', 'packets', 'glow', 'wave', 'xray', 'ping'];
  var calm = ['packets', 'xray'];
  var asked = new URLSearchParams(location.search).get('pointer');
  var last = DT.session('dt-pointer');
  var allowed = still ? calm : names;
  var pool = allowed.filter(function (n) { return n !== last; });
  var pick = allowed.indexOf(asked) >= 0 ? asked : pool[Math.floor(Math.random() * pool.length)];
  DT.session('dt-pointer', pick);
  DT.pointer = pick;

  var fine = window.matchMedia('(pointer: fine)').matches;
  var make = function (tag, cls) {
    var el = document.createElement(tag);
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    return el;
  };
  // Taps inside the command line, the arcade or a text field are for them, not for the effect.
  var ours = function (e) { return !(e.target && e.target.closest && e.target.closest('.shell, .arcade, input, textarea')); };
  var hex = function (n) { return (n < 16 ? '0' : '') + n.toString(16); };
  var ink = function () { return getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#7CFF9B'; };

  var effects = {
    mac: function () {
      var arrow = make('div', 'mac-pointer');
      arrow.innerHTML = '<svg viewBox="0 0 20 28" width="20" height="28"><path d="M2 2v19l5-5 4 9 3-1.3-4-9h7z"/></svg>';
      document.body.appendChild(arrow);
      var pos = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.4 };
      var target = { x: pos.x, y: pos.y };
      var click = false, running = false, parked = null, lastInput = 0, hideTimer = null;
      var place = function () {
        arrow.style.transform = 'translate(' + (pos.x - 2).toFixed(1) + 'px,' + (pos.y - 2).toFixed(1) + 'px)';
      };
      var show = function (on) { arrow.classList.toggle('on', on); };
      var ring = function () {
        var r = make('span', 'mac-click');
        r.style.left = pos.x + 'px';
        r.style.top = pos.y + 'px';
        document.body.appendChild(r);
        setTimeout(function () { r.remove(); }, 500);
      };
      var tick = function () {
        var dx = target.x - pos.x, dy = target.y - pos.y;
        pos.x += dx * 0.13;
        pos.y += dy * 0.13;
        if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) {
          pos.x = target.x; pos.y = target.y;
          place();
          running = false;
          if (click) { click = false; ring(); }
          return;
        }
        place();
        requestAnimationFrame(tick);
      };
      var go = function () { if (!running) { running = true; requestAnimationFrame(tick); } };
      var unpark = function () { if (parked) { parked.classList.remove('waiting'); parked = null; } };
      if (fine) {
        window.addEventListener('pointermove', function (e) {
          if (e.pointerType !== 'mouse') return;
          target = { x: e.clientX + 10, y: e.clientY + 10 };
          lastInput = Date.now();
          unpark();
          show(true);
          go();
        }, { passive: true });
        document.documentElement.addEventListener('mouseleave', function () { if (!parked) show(false); });
        // Idle: park beside the headline's blinking cursor, if it is on screen.
        setInterval(function () {
          if (parked || !lastInput || Date.now() - lastInput < 5000 || document.hidden) return;
          var c = document.querySelector('.hero h1 .cursor');
          if (!c) return;
          var r = c.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) return;
          parked = c;
          c.classList.add('waiting');
          target = { x: r.right + 6, y: r.bottom - 4 };
          show(true);
          go();
        }, 500);
      }
      window.addEventListener('pointerdown', function (e) {
        if (!ours(e)) return;
        target = { x: e.clientX, y: e.clientY };
        click = true;
        lastInput = Date.now();
        unpark();
        show(true);
        go();
        // A finger leaves nothing to follow, so the arrow fades once it has clicked.
        clearTimeout(hideTimer);
        if (e.pointerType !== 'mouse') hideTimer = setTimeout(function () { show(false); }, 1600);
      }, { passive: true });
      // Scrolling moves the page under a parked arrow; let it go back to following.
      window.addEventListener('scroll', function () { if (parked) { unpark(); show(false); } }, { passive: true });
      place();
    },

    packets: function () {
      var box = make('div', 'packets');
      document.body.appendChild(box);
      var X = 0, Y = 0, down = 0, log = [], taps = 0, note = '', fade = null;
      var bytes = function (m) { return [5, m, X >> 8, X & 255, Y >> 8, Y & 255].map(hex).join(' '); };
      var line = function (text, cls) { var d = document.createElement('div'); d.className = cls; d.textContent = text; return d; };
      var draw = function () {
        box.textContent = '';
        log.forEach(function (l) { box.appendChild(line(l, 'old')); });
        if (note) box.appendChild(line(note, 'old'));
        box.appendChild(line(bytes(down), down ? 'now on' : 'now'));
        box.classList.add('on');
        clearTimeout(fade);
        fade = setTimeout(function () { box.classList.remove('on'); }, 6000);
      };
      // Where the pointer is, on a pretend 2560 × 1600 Mac screen.
      var at = function (e) {
        X = Math.max(0, Math.min(2559, Math.round(e.clientX / window.innerWidth * 2559)));
        Y = Math.max(0, Math.min(1599, Math.round(e.clientY / window.innerHeight * 1599)));
      };
      var pending = false;
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; at(e); draw(); });
      }, { passive: true });
      window.addEventListener('pointerdown', function (e) {
        if (!ours(e)) return;
        at(e);
        down = 1;
        log.push(bytes(1));
        if (++taps === 6) note = "# six bytes. that's all a tap is.";
        log = log.slice(-3);
        draw();
      }, { passive: true });
      var up = function () {
        if (!down) return;
        down = 0;
        log.push(bytes(0));
        log = log.slice(-3);
        draw();
      };
      window.addEventListener('pointerup', up, { passive: true });
      window.addEventListener('pointercancel', up, { passive: true });
    },

    glow: function () {
      var c = make('canvas', 'afterglow');
      document.body.appendChild(c);
      var g = c.getContext('2d');
      if (!g) return;
      var last = null, idle = 0, running = false, colour = ink();
      var size = function () {
        var dpr = window.devicePixelRatio || 1;
        c.width = Math.round(window.innerWidth * dpr);
        c.height = Math.round(window.innerHeight * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.lineCap = 'round';
      };
      size();
      window.addEventListener('resize', size);
      var loop = function () {
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = 'rgba(0,0,0,0.09)';
        g.fillRect(0, 0, window.innerWidth, window.innerHeight);
        g.globalCompositeOperation = 'source-over';
        if (++idle > 120) { running = false; g.clearRect(0, 0, window.innerWidth, window.innerHeight); return; }
        requestAnimationFrame(loop);
      };
      var kick = function () { idle = 0; if (!running) { running = true; requestAnimationFrame(loop); } };
      window.addEventListener('pointermove', function (e) {
        var p = { x: e.clientX, y: e.clientY };
        if (e.pointerType !== 'mouse' && !e.pressure) { last = null; return; }
        if (last) {
          g.strokeStyle = colour; g.shadowColor = colour; g.shadowBlur = 8; g.lineWidth = 2;
          g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
        }
        last = p;
        kick();
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () { last = null; });
      window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') last = null; }, { passive: true });
      window.addEventListener('scroll', function () { last = null; }, { passive: true });
      window.addEventListener('pointerdown', function (e) {
        if (!ours(e)) return;
        colour = ink();
        g.fillStyle = colour; g.shadowColor = colour; g.shadowBlur = 16;
        for (var i = 0; i < 3; i++) { g.beginPath(); g.arc(e.clientX, e.clientY, 4, 0, 7); g.fill(); }
        last = { x: e.clientX, y: e.clientY };
        kick();
      }, { passive: true });
    },

    wave: function () {
      var steps = ['@', 'O', 'o', '.', '.'];
      window.addEventListener('pointerdown', function (e) {
        if (!ours(e)) return;
        var x = e.clientX, y = e.clientY, n = 14, spans = [], t0 = performance.now();
        for (var i = 0; i < n; i++) { var s = make('span', 'wave-ch'); document.body.appendChild(s); spans.push(s); }
        var frame = function (now) {
          var k = Math.max(0, Math.min(1, (now - t0) / 650)), r = 6 + k * 96;
          spans.forEach(function (s, i) {
            var a = i / n * Math.PI * 2;
            s.style.transform = 'translate(' + (x + Math.cos(a) * r).toFixed(1) + 'px,' + (y + Math.sin(a) * r * 0.8).toFixed(1) + 'px) translate(-50%,-50%)';
            s.textContent = steps[Math.min(4, Math.floor(k * 5))];
            s.style.opacity = String(1 - k);
          });
          if (k < 1) requestAnimationFrame(frame); else spans.forEach(function (s) { s.remove(); });
        };
        requestAnimationFrame(frame);
      }, { passive: true });
    },

    xray: function () {
      var layer = make('div', 'xray');
      document.body.appendChild(layer);
      var hints = ['press /', 'up up down down', 'cat secrets.txt', 'degauss', 'type cursor', 'sudo', 'rain', 'fsck'];
      var seed = 42;
      var rnd = function () { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
      var fill = function () {
        layer.textContent = '';
        var rows = Math.ceil(window.innerHeight / 19) + 1, cols = Math.max(8, Math.ceil(window.innerWidth / 24));
        seed = 42;
        for (var i = 0; i < rows; i++) {
          var row = (i * 16).toString(16);
          row = '0x' + '0000'.slice(row.length) + row + '  ';
          for (var j = 0; j < cols; j++) row += hex(Math.floor(rnd() * 256)) + ' ';
          var d = document.createElement('div');
          if (i % 3 === 1) {
            // A secret sits a little way into the row, among the bytes.
            var cut = 9 + 3 * (2 + Math.floor(rnd() * Math.max(1, cols / 3)));
            d.appendChild(document.createTextNode(row.slice(0, cut)));
            var em = document.createElement('em');
            em.textContent = hints[((i - 1) / 3) % hints.length];
            d.appendChild(em);
            d.appendChild(document.createTextNode(' ' + row.slice(cut + em.textContent.length + 1)));
          } else {
            d.textContent = row;
          }
          layer.appendChild(d);
        }
      };
      fill();
      window.addEventListener('resize', fill);
      var off = null, hold = null;
      var aim = function (e) {
        layer.style.setProperty('--x', e.clientX + 'px');
        layer.style.setProperty('--y', e.clientY + 'px');
      };
      var reveal = function (ms) {
        layer.classList.add('on');
        clearTimeout(off);
        if (ms) off = setTimeout(function () { layer.classList.remove('on'); }, ms);
      };
      // With a mouse it shows only while the pointer moves, and never over something you can click, so reading
      // and clicking are untouched.
      window.addEventListener('pointermove', function (e) {
        aim(e);
        if (e.pointerType !== 'mouse') return;
        if (e.target && e.target.closest && e.target.closest('a, button, summary, label, input, textarea, .shell, .arcade')) {
          layer.classList.remove('on');
          return;
        }
        reveal(700);
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () { layer.classList.remove('on'); });
      window.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' || !ours(e)) return;
        aim(e);
        clearTimeout(hold);
        hold = setTimeout(function () { reveal(0); }, 250);
      }, { passive: true });
      var end = function (e) {
        if (e.pointerType === 'mouse') return;
        clearTimeout(hold);
        layer.classList.remove('on');
      };
      window.addEventListener('pointerup', end, { passive: true });
      window.addEventListener('pointercancel', end, { passive: true });
    },

    ping: function () {
      var seq = 0;
      window.addEventListener('pointerdown', function (e) {
        if (!ours(e)) return;
        seq++;
        var msg = seq % 7 === 0 ? '(it misses you)'
          : '64 bytes from mac: seq=' + seq + ' time=' + (2.4 + Math.random() * 2.4).toFixed(1) + ' ms';
        var t = make('span', 'ping-reply');
        t.style.top = Math.max(4, e.clientY - 24) + 'px';
        // Grow away from the nearer edge, so the line stays on screen.
        if (e.clientX > window.innerWidth * 0.55) t.style.right = Math.max(8, window.innerWidth - e.clientX) + 'px';
        else t.style.left = Math.max(8, e.clientX) + 'px';
        document.body.appendChild(t);
        var i = 0;
        var type = function () { t.textContent = msg.slice(0, ++i); if (i < msg.length) setTimeout(type, 14); };
        type();
        setTimeout(function () { t.remove(); }, 2000);
      }, { passive: true });
    }
  };

  document.documentElement.setAttribute('data-pointer', pick);
  try { effects[pick](); } catch (e) { /* decoration only: the page works without it */ }
})();
