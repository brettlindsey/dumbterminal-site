// Dumb Terminal's site, part 1: shared helpers, the hero boot sequence, the step log, sections that print in, and
// the Prompt Clock. Everything here is decoration: the page reads fine without it.
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Shared by the other scripts.
  var DT = window.DT = {
    still: function () { return reduce.matches; },
    get: function (key, fallback) {
      try { var v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
    },
    set: function (key, value) { try { localStorage.setItem(key, value); } catch (e) { /* fine without it */ } },
    session: function (key, value) {
      try {
        if (value === undefined) return sessionStorage.getItem(key);
        sessionStorage.setItem(key, value);
      } catch (e) { return null; }
    },
    prompt: function () { return document.documentElement.classList.contains('root') ? '#' : '%'; },
    pad: function (n) { return (n < 10 ? '0' : '') + n; }
  };

  // ---- Boot: types a short login, a list of Macs, then lands on the headline. Under 2 seconds, once per visit;
  // any key, click, touch or scroll skips it. ----
  var boot = document.querySelector('.boot');
  var bootTimer = null;
  var bootLines = function () {
    var now = new Date();
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var stamp = days[now.getDay()] + ' ' + months[now.getMonth()] + ' ' + now.getDate() + ' ' +
      DT.pad(now.getHours()) + ':' + DT.pad(now.getMinutes());
    // On a phone, three lines, so the headline and the app's screenshots stay in the first screen.
    if (window.matchMedia('(max-width: 600px)').matches) {
      return [
        [DT.prompt() + ' ls ~/macs', 'hi'],
        ['studio      home   ready', ''],
        [DT.prompt() + ' echo "$(cat pitch.txt)"', 'hi']
      ];
    }
    return [
      ['Last login: ' + stamp + ' on ttys-web', ''],
      [DT.prompt() + ' ls ~/macs', 'hi'],
      ['studio      home   ready', ''],
      ['macmini     home   asleep', ''],
      ['macbook     away   via tailscale', ''],
      [DT.prompt() + ' echo "$(cat pitch.txt)"', 'hi']
    ];
  };
  var drawAll = function (lines) {
    boot.textContent = '';
    lines.forEach(function (line, i) {
      var span = document.createElement('span');
      if (line[1]) span.className = line[1];
      span.textContent = line[0] + (i < lines.length - 1 ? '\n' : '');
      boot.appendChild(span);
    });
  };
  var stopSkips = function () {
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(function (type) { window.removeEventListener(type, skip, true); });
  };
  var skip = function () {
    if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
    drawAll(bootLines());
    stopSkips();
  };
  DT.boot = function (force) {
    if (!boot) return;
    var lines = bootLines();
    if (DT.still() || (!force && DT.session('dt-booted'))) { drawAll(lines); return; }
    DT.session('dt-booted', '1');
    boot.textContent = '';
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(function (type) { window.addEventListener(type, skip, true); });
    // Budget: about 1.8 seconds across every character.
    var total = lines.reduce(function (n, l) { return n + l[0].length + 1; }, 0);
    var perChar = Math.max(6, Math.floor(1700 / total));
    var lineIndex = 0;
    var charIndex = 0;
    var span = null;
    var tick = function () {
      if (lineIndex >= lines.length) { bootTimer = null; stopSkips(); return; }
      var line = lines[lineIndex];
      if (!span) {
        span = document.createElement('span');
        if (line[1]) span.className = line[1];
        boot.appendChild(span);
      }
      charIndex += line[1] === 'hi' ? 1 : 3;
      span.textContent = line[0].slice(0, charIndex);
      if (charIndex >= line[0].length) {
        if (lineIndex < lines.length - 1) span.textContent += '\n';
        lineIndex += 1;
        charIndex = 0;
        span = null;
      }
      bootTimer = setTimeout(tick, line[1] === 'hi' ? perChar * 1.6 : perChar);
    };
    tick();
  };
  DT.boot(false);

  // ---- The setup steps print as a step log with a text progress bar as they scroll into view. ----
  var bars = document.querySelectorAll('[data-bar]');
  var fill = function (el) {
    if (DT.still()) return;
    var step = 0;
    var run = function () {
      step += 1;
      var done = Math.min(10, step);
      el.textContent = '[' + '##########'.slice(0, done) + '----------'.slice(done) + '] ' + (done === 10 ? 'ok' : done * 10 + '%');
      if (done < 10) setTimeout(run, 45 + Math.random() * 60);
    };
    el.textContent = '[----------] 0%';
    run();
  };

  // ---- Sections print in line by line, once. ----
  var blocks = document.querySelectorAll('.block');
  if (!DT.still() && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('printing');
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('printed');
        entry.target.querySelectorAll('[data-bar]').forEach(function (bar, i) { setTimeout(function () { fill(bar); }, 250 + i * 380); });
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    blocks.forEach(function (b) { seen.observe(b); });
  }

  // ---- The support address is never in the HTML, so address harvesters reading the page find nothing to take.
  // It is put together here; without JavaScript the link reads "support [at] dumbterminal [dot] app". A link whose
  // label is a button's words (./ask-for-an-invite) keeps them. ----
  document.querySelectorAll('[data-mail]').forEach(function (a) {
    var address = a.getAttribute('data-mail') + String.fromCharCode(64) + ['dumbterminal', 'app'].join('.');
    var subject = a.getAttribute('data-subject');
    a.href = 'mailto:' + address + (subject ? '?subject=' + encodeURIComponent(subject) : '');
    if (/\[at\]/.test(a.textContent)) a.textContent = address;
  });

  // ---- The 404 page names the address that wasn't found. ----
  document.querySelectorAll('[data-missing]').forEach(function (el) {
    var path = location.pathname;
    try { path = decodeURIComponent(path); } catch (e) { /* keep it encoded */ }
    el.textContent = path.replace(/^\//, '') || 'this page';
  });

  // ---- The Prompt Clock: the visitor's time, how long the tab has been open, a blinking cursor. ----
  var clock = document.querySelector('[data-clock]');
  var uptime = document.querySelector('[data-uptime]');
  var started = Date.now();
  var tickClock = function () {
    var now = new Date();
    if (clock) clock.textContent = DT.pad(now.getHours()) + ':' + DT.pad(now.getMinutes());
    if (uptime) {
      var mins = Math.floor((Date.now() - started) / 60000);
      uptime.textContent = 'ttys-web · up ' + (mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm');
    }
  };
  tickClock();
  setInterval(tickClock, 15000);

  // ---- Now and then (every 1 to 3 minutes), a bright line sweeps down the screen, like a tube refreshing. ----
  if (!DT.still()) {
    var sweep = function () {
      if (!document.hidden && !DT.still()) {
        var line = document.createElement('div');
        line.className = 'sweep';
        line.setAttribute('aria-hidden', 'true');
        line.addEventListener('animationend', function () { line.remove(); });
        document.body.appendChild(line);
      }
      setTimeout(sweep, (60 + Math.random() * 120) * 1000);
    };
    setTimeout(sweep, (60 + Math.random() * 120) * 1000);
  }
})();
