// Dumb Terminal's site, part 4: a tiny arcade. Up, up, down, down (arrow keys, or four swipes on a phone) opens it;
// so does `arcade` in the command line. Two games: Snake and Stack. Best scores stay in this browser.
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT) return;

  var overlay = null;
  var canvas = null;
  var g = null;
  var status = null;
  var help = null;
  var menu = null;
  var game = null;     // the running game, with .key(name), .tap(), .swipe(dir), .stop()
  var opener = null;

  var color = function (name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  };

  var build = function () {
    overlay = document.createElement('div');
    overlay.className = 'arcade';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Arcade');
    overlay.hidden = true;
    var box = document.createElement('div');
    box.className = 'arcade-box';
    var title = document.createElement('p');
    title.className = 'arcade-title';
    title.textContent = 'ARCADE';
    menu = document.createElement('div');
    menu.className = 'arcade-menu';
    [['snake', 'Snake'], ['stack', 'Stack']].forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = '▶ ' + item[1];
      b.addEventListener('click', function () { start(item[0]); });
      menu.appendChild(b);
    });
    var quit = document.createElement('button');
    quit.type = 'button';
    quit.className = 'arcade-quit';
    quit.textContent = 'esc · close';
    quit.addEventListener('click', close);
    canvas = document.createElement('canvas');
    canvas.className = 'arcade-screen';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = true;
    status = document.createElement('p');
    status.className = 'arcade-status';
    status.setAttribute('aria-live', 'polite');
    help = document.createElement('p');
    help.className = 'arcade-help';
    box.appendChild(title);
    box.appendChild(menu);
    box.appendChild(canvas);
    box.appendChild(status);
    box.appendChild(help);
    box.appendChild(quit);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    g = canvas.getContext('2d');

    // Touch: swipes steer, taps act.
    var t0 = null;
    canvas.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; t0 = { x: t.clientX, y: t.clientY }; }, { passive: true });
    canvas.addEventListener('touchend', function (e) {
      if (!t0 || !game) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - t0.x;
      var dy = t.clientY - t0.y;
      t0 = null;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) { game.tap(); return; }
      game.swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    canvas.addEventListener('click', function (e) { if (game && e.pointerType !== 'touch') game.tap(); });
  };

  var open = function () {
    if (!overlay) build();
    if (DT.shell && DT.shell.isOpen()) DT.shell.close();
    opener = document.activeElement;
    overlay.hidden = false;
    showMenu();
  };
  var close = function () {
    if (game) { game.stop(); game = null; }
    if (overlay) overlay.hidden = true;
    if (opener && opener.focus) opener.focus();
  };
  var showMenu = function () {
    if (game) { game.stop(); game = null; }
    menu.hidden = false;
    canvas.hidden = true;
    status.textContent = 'choose a game';
    help.textContent = 'keys or swipes to play · esc to close';
    menu.querySelector('button').focus();
  };
  var start = function (name) {
    menu.hidden = true;
    canvas.hidden = false;
    var side = Math.min(360, Math.floor(window.innerWidth * 0.82));
    canvas.width = side;
    canvas.height = name === 'stack' ? side * 1.6 > window.innerHeight * 0.62 ? Math.floor(window.innerHeight * 0.62) : Math.floor(side * 1.6) : side;
    // Stack's well is 6 by 12: make the canvas exactly that shape.
    if (name === 'stack') canvas.width = Math.floor(canvas.height / 2);
    canvas.style.width = canvas.width + 'px';
    game = name === 'snake' ? snake() : stack();
    canvas.focus();
  };
  DT.arcade = {
    open: open,
    // True while the arcade is open or its code is being typed, so other key handlers stay out of the way.
    busy: function () { return (overlay && !overlay.hidden) || progress >= 4; }
  };

  // ---- Snake ----
  var snake = function () {
    var N = 16;
    var body = [[8, 8], [7, 8], [6, 8]];
    var dir = [1, 0];
    var queued = null;
    var food = [12, 5];
    var over = false;
    var score = 0;
    var best = +DT.get('dt-snake-best', 0);
    help.textContent = 'arrows or swipes to steer · enter or tap to restart';
    var place = function () {
      do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; }
      while (body.some(function (p) { return p[0] === food[0] && p[1] === food[1]; }));
    };
    var draw = function () {
      var s = canvas.width / N;
      g.fillStyle = color('--bg', '#0A0F0A');
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = color('--warn', '#FFD866');
      g.fillRect(food[0] * s + 3, food[1] * s + 3, s - 6, s - 6);
      g.fillStyle = color('--text', '#7CFF9B');
      body.forEach(function (p) { g.fillRect(p[0] * s + 1, p[1] * s + 1, s - 2, s - 2); });
      status.textContent = over ? 'game over · score ' + score + ' · best ' + best : 'score ' + score + ' · best ' + Math.max(best, score);
    };
    var turn = function (d) {
      if (d[0] === -dir[0] && d[1] === -dir[1]) return;
      queued = d;
    };
    var timer = setInterval(function () {
      if (over) return;
      if (queued) { dir = queued; queued = null; }
      var head = [body[0][0] + dir[0], body[0][1] + dir[1]];
      var hitWall = head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N;
      var hitSelf = body.slice(0, -1).some(function (p) { return p[0] === head[0] && p[1] === head[1]; });
      if (hitWall || hitSelf) {
        over = true;
        if (score > best) { best = score; DT.set('dt-snake-best', String(best)); }
        draw();
        return;
      }
      body.unshift(head);
      if (head[0] === food[0] && head[1] === food[1]) { score += 1; place(); } else body.pop();
      draw();
    }, 130);
    draw();
    var dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    return {
      key: function (k) {
        if (over && (k === 'enter' || k === 'space')) { clearInterval(timer); game = snake(); return; }
        if (dirs[k]) turn(dirs[k]);
      },
      swipe: function (d) { turn(dirs[d]); },
      tap: function () { if (over) { clearInterval(timer); game = snake(); } },
      stop: function () { clearInterval(timer); }
    };
  };

  // ---- Stack: columns of three fall; line up three of a kind across, down or diagonally to clear them. ----
  var stack = function () {
    var C = 6;
    var R = 12;
    var board = [];
    for (var i = 0; i < C * R; i++) board.push(-1);
    var newPiece = function () { return [0, 1, 2].map(function () { return Math.floor(Math.random() * 4); }); };
    var piece = newPiece();
    var x = 2;
    var y = -3;
    var score = 0;
    var over = false;
    var best = +DT.get('dt-stack-best', 0);
    help.textContent = '←→ or swipe to move · ↑ or tap to shuffle · ↓ or swipe down to drop';
    var at = function (cx, cy) { return cx < 0 || cx >= C || cy < 0 || cy >= R ? -1 : board[cy * C + cx]; };
    var fits = function (nx, ny) {
      if (nx < 0 || nx >= C) return false;
      for (var k = 0; k < 3; k++) {
        var row = ny + k;
        if (row >= R) return false;
        if (row >= 0 && board[row * C + nx] !== -1) return false;
      }
      return true;
    };
    var resolve = function () {
      var chain = 1;
      for (;;) {
        var hit = {};
        for (var cy = 0; cy < R; cy++) for (var cx = 0; cx < C; cx++) {
          var kind = at(cx, cy);
          if (kind < 0) continue;
          [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(function (d) {
            var run = [[cx, cy]];
            var px = cx + d[0];
            var py = cy + d[1];
            while (at(px, py) === kind) { run.push([px, py]); px += d[0]; py += d[1]; }
            if (run.length >= 3) run.forEach(function (p) { hit[p[1] * C + p[0]] = true; });
          });
        }
        var keys = Object.keys(hit);
        if (!keys.length) return;
        keys.forEach(function (k) { board[k] = -1; });
        score += keys.length * 10 * chain;
        chain += 1;
        for (var col = 0; col < C; col++) {
          var cells = [];
          for (var r = 0; r < R; r++) if (board[r * C + col] !== -1) cells.push(board[r * C + col]);
          for (var r2 = R - 1; r2 >= 0; r2--) board[r2 * C + col] = cells.length ? cells.pop() : -1;
        }
      }
    };
    var land = function () {
      for (var k = 0; k < 3; k++) {
        if (y + k < 0) { over = true; break; }
        board[(y + k) * C + x] = piece[k];
      }
      if (!over) {
        resolve();
        piece = newPiece();
        x = 2;
        y = -3;
        if (!fits(x, 0)) over = true;
      }
      if (over && score > best) { best = score; DT.set('dt-stack-best', String(best)); }
    };
    var fall = function () {
      if (over) return;
      if (fits(x, y + 1)) y += 1; else land();
      draw();
    };
    var shape = function (kind, cx, cy, s) {
      var px = cx * s;
      var py = cy * s;
      var ink = color('--text', '#7CFF9B');
      g.fillStyle = ink;
      g.strokeStyle = ink;
      g.lineWidth = Math.max(2, s / 9);
      var m = s * 0.18;
      if (kind === 0) g.fillRect(px + m, py + m, s - 2 * m, s - 2 * m);
      else if (kind === 1) g.strokeRect(px + m, py + m, s - 2 * m, s - 2 * m);
      else if (kind === 2) { g.beginPath(); g.arc(px + s / 2, py + s / 2, s / 2 - m, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.moveTo(px + m, py + m); g.lineTo(px + s - m, py + s - m); g.moveTo(px + s - m, py + m); g.lineTo(px + m, py + s - m); g.stroke(); }
    };
    var draw = function () {
      var s = Math.min(canvas.width / C, canvas.height / R);
      g.fillStyle = color('--bg', '#0A0F0A');
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.strokeStyle = color('--line', '#1F3A26');
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, C * s - 1, R * s - 1);
      for (var cy = 0; cy < R; cy++) for (var cx = 0; cx < C; cx++) if (at(cx, cy) >= 0) shape(at(cx, cy), cx, cy, s);
      for (var k = 0; k < 3; k++) if (y + k >= 0) shape(piece[k], x, y + k, s);
      status.textContent = over ? 'game over · score ' + score + ' · best ' + best : 'score ' + score + ' · best ' + Math.max(best, score);
    };
    var tick = function () {
      fall();
      if (!over) timer = setTimeout(tick, Math.max(160, 650 - score / 3));
    };
    var timer = setTimeout(tick, 650);
    draw();
    var act = {
      left: function () { if (fits(x - 1, y)) x -= 1; },
      right: function () { if (fits(x + 1, y)) x += 1; },
      up: function () { piece = [piece[2], piece[0], piece[1]]; },
      down: function () { while (fits(x, y + 1)) y += 1; land(); }
    };
    return {
      key: function (k) {
        if (over) { if (k === 'enter' || k === 'space') { clearTimeout(timer); game = stack(); } return; }
        if (k === 'space') k = 'up';
        if (act[k]) { act[k](); draw(); }
      },
      swipe: function (d) { if (!over && act[d]) { act[d](); draw(); } },
      tap: function () {
        if (over) { clearTimeout(timer); game = stack(); return; }
        act.up();
        draw();
      },
      stop: function () { clearTimeout(timer); }
    };
  };

  // ---- Keys: the code to open it, and the controls while it's open. ----
  var names = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', Enter: 'enter', ' ': 'space' };
  // Up, up, down, down opens the arcade. Keep going (left, right, left, right, b, a) and the page panics instead.
  var code = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];
  var keyNames = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', b: 'b', B: 'b', a: 'a', A: 'a' };
  var progress = 0;
  var pending = null;
  var openNow = function () { clearTimeout(pending); pending = null; progress = 0; open(); };
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
    if (overlay && !overlay.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); if (game) showMenu(); else close(); return; }
      var k = names[e.key];
      if (game && k) { e.preventDefault(); game.key(k); }
      return;
    }
    if (typing) return;
    var n = keyNames[e.key] || null;
    if (pending && n !== 'left') { openNow(); return; }
    clearTimeout(pending);
    pending = null;
    progress = n === code[progress] ? progress + 1 : (n === 'up' ? 1 : 0);
    if (progress === 4) pending = setTimeout(openNow, 700);
    if (progress === code.length) { progress = 0; if (DT.panic) DT.panic(); }
  });

  // On a phone: four swipes, up, up, down, down, anywhere on the page.
  var swipes = [];
  var start0 = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    start0 = { y: e.touches[0].clientY, x: e.touches[0].clientX, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!start0 || (overlay && !overlay.hidden)) return;
    var t = e.changedTouches[0];
    var dy = t.clientY - start0.y;
    var dx = t.clientX - start0.x;
    var quick = Date.now() - start0.t < 600;
    start0 = null;
    if (!quick || Math.abs(dy) < 50 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
    var now = Date.now();
    swipes = swipes.filter(function (s) { return now - s.t < 4000; });
    swipes.push({ d: dy < 0 ? 'up' : 'down', t: now });
    var seq = swipes.slice(-4).map(function (s) { return s.d; }).join(',');
    if (seq === 'up,up,down,down') { swipes = []; open(); }
  }, { passive: true });

  if (DT.shell) DT.shell.register(['arcade', 'games', 'play'], function () { DT.shell.say('inserting quarter…'); open(); });
})();
