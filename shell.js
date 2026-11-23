// Dumb Terminal's site, part 3: a small command line, in two places. The page ends on a live prompt (start typing
// anywhere and the letters land there), and / or ~ or any blinking cursor opens the same shell as a panel. `help`
// lists a few commands; the rest are for finding. Other scripts add commands with DT.shell.register().
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT) return;

  var commands = {};
  var history = [];
  var historyIndex = 0;
  var panel = null;   // the pop-up shell
  var popup = null;   // its log and input
  var tail = null;    // the prompt at the end of the page
  var active = null;  // whichever one ran the last command
  var opener = null;

  var ps1 = function (long) {
    var root = DT.prompt() === '#';
    return (long ? (root ? 'root' : 'guest') + '@dumbterminal ~ ' : '') + DT.prompt() + ' ';
  };

  // A log and a one-line form, used by both the panel and the tail.
  var makeLine = function (host, id, long, onEscape) {
    var s = { long: long };
    s.log = document.createElement('div');
    s.log.className = 'shell-log';
    s.log.setAttribute('role', 'log');
    s.log.setAttribute('aria-live', 'polite');
    var form = document.createElement('form');
    form.className = 'shell-line';
    form.setAttribute('autocomplete', 'off');
    var label = document.createElement('label');
    label.setAttribute('for', id);
    label.className = 'sr-only';
    label.textContent = 'Command. Type help for a list.';
    s.prompt = document.createElement('span');
    s.prompt.className = 'ps1';
    s.prompt.setAttribute('aria-hidden', 'true');
    s.prompt.textContent = ps1(long);
    s.input = document.createElement('input');
    s.input.id = id;
    s.input.type = 'text';
    s.input.setAttribute('autocapitalize', 'off');
    s.input.setAttribute('autocorrect', 'off');
    s.input.setAttribute('spellcheck', 'false');
    s.input.setAttribute('enterkeyhint', 'go');
    form.appendChild(label);
    form.appendChild(s.prompt);
    form.appendChild(s.input);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cmd = s.input.value.trim();
      s.input.value = '';
      if (!cmd) return;
      active = s;
      history.push(cmd);
      historyIndex = history.length;
      say(ps1(long) + cmd, 'echo');
      run(cmd);
      refreshPrompts();
      if (s === tail) s.input.scrollIntoView({ block: 'nearest' });
    });
    s.input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); onEscape(); }
      if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); historyIndex = Math.max(0, historyIndex - 1); s.input.value = history[historyIndex]; }
      if (e.key === 'ArrowDown' && history.length) { e.preventDefault(); historyIndex = Math.min(history.length, historyIndex + 1); s.input.value = history[historyIndex] || ''; }
    });
    host.appendChild(s.log);
    host.appendChild(form);
    return s;
  };
  var refreshPrompts = function () {
    [popup, tail].forEach(function (s) { if (s) s.prompt.textContent = ps1(s.long); });
  };

  var say = function (text, cls) {
    var s = active || popup || tail;
    if (!s) return;
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    s.log.appendChild(line);
    s.log.scrollTop = s.log.scrollHeight;
  };

  var buildPanel = function () {
    panel = document.createElement('div');
    panel.className = 'shell';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Command line');
    panel.hidden = true;
    var bar = document.createElement('div');
    bar.className = 'shell-bar';
    var title = document.createElement('span');
    title.textContent = 'ttys-web';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'shell-close';
    close.textContent = 'esc';
    close.setAttribute('aria-label', 'Close the command line');
    close.addEventListener('click', function () { DT.shell.close(); });
    bar.appendChild(title);
    bar.appendChild(close);
    panel.appendChild(bar);
    popup = makeLine(panel, 'shell-input', false, function () { DT.shell.close(); });
    document.body.appendChild(panel);
    active = popup;
    say('dumbterminal.app — type help.', 'dim');
  };

  var run = function (raw) {
    var cmd = raw.toLowerCase().replace(/\s+/g, ' ');
    var word = cmd.split(' ')[0];
    var handler = commands[cmd] || commands[word];
    if (handler) handler(cmd, raw);
    else say('dt: command not found: ' + raw + '. try help.', 'err');
  };

  DT.shell = {
    say: say,
    register: function (names, fn) { names.forEach(function (n) { commands[n] = fn; }); },
    open: function (from) {
      if (!panel) buildPanel();
      opener = from || document.activeElement;
      active = popup;
      refreshPrompts();
      panel.hidden = false;
      popup.input.focus();
    },
    close: function () {
      if (!panel || panel.hidden) return;
      panel.hidden = true;
      if (opener && opener.focus) opener.focus();
    },
    isOpen: function () { return !!panel && !panel.hidden; }
  };

  // ---- The prompt at the end of the page. Without JavaScript it's just a line of text. ----
  var tailHost = document.querySelector('[data-tail]');
  if (tailHost) {
    tailHost.textContent = '';
    tailHost.removeAttribute('aria-hidden');
    tail = makeLine(tailHost, 'tail-input', true, function () { tail.input.blur(); });
  }
  var still = DT.still();
  var typeIntoTail = function (ch) {
    tail.input.focus({ preventScroll: true });
    tail.input.value += ch;
    tail.input.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  };

  // ---- Openers. / or ~ (or `) open the panel; a letter or digit, with no field focused, starts typing at the
  // prompt at the end of the page. Blinking cursors open the panel. ----
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    if (e.key === '/' || e.key === '~' || e.key === '`') { e.preventDefault(); DT.shell.open(); return; }
    if (!tail || DT.shell.isOpen() || (DT.arcade && DT.arcade.busy())) return;
    if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) { e.preventDefault(); typeIntoTail(e.key); }
  });
  document.querySelectorAll('[data-shell]').forEach(function (b) {
    b.addEventListener('click', function () { DT.shell.open(b); });
  });

  // ---- Root: the prompt turns to #, and the page says so, with a way to the beta. ----
  DT.root = function () {
    document.documentElement.classList.add('root');
    refreshPrompts();
    if (document.querySelector('.root-banner')) return;
    var banner = document.createElement('div');
    banner.className = 'root-banner';
    banner.setAttribute('role', 'status');
    var text = document.createElement('span');
    text.textContent = '# root access granted. ';
    var link = document.createElement('a');
    link.href = '/#beta';
    link.textContent = 'the real thing is in the app →';
    link.addEventListener('click', function () { DT.shell.close(); });
    var x = document.createElement('button');
    x.type = 'button';
    x.textContent = 'dismiss';
    x.addEventListener('click', function () { banner.remove(); });
    banner.appendChild(text);
    banner.appendChild(link);
    banner.appendChild(x);
    document.body.insertBefore(banner, document.body.firstChild);
  };

  // ---- The old-games code (↑↑↓↓←→←→ b a, from arcade.js): the page panics, then you're root. ----
  DT.panic = function () {
    var finish = function () {
      document.body.classList.remove('glitch');
      DT.shell.open();
      say('!! PANIC 0x0D1E: SITE_TOO_RETRO', 'err');
      say('...just kidding. you are now root (on this page).');
      DT.root();
    };
    if (still) { finish(); return; }
    document.body.classList.add('glitch');
    setTimeout(finish, 2100);
  };

  // ---- The commands ----
  var reg = DT.shell.register;
  reg(['help', '?'], function () {
    say('help     this list\nls ~/macs  your macs\nwhoami   who you are\ndate     what time it is\nclear    clean screen\nexit     log out');
    say('(there are more. some of them change the whole page.)', 'dim');
  });
  reg(['ls'], function (cmd) {
    if (cmd === 'ls' || cmd === 'ls ~' || cmd === 'ls ~/' || cmd === 'ls -la' || cmd === 'ls -a') { say('macs/   screens/   pitch.txt   secrets.txt'); return; }
    if (cmd.indexOf('screen') > -1) { say('home.png   session.png   status.png   config.png   away.png'); return; }
    say('studio      home   ready\nmacmini     home   asleep\nmacbook     away   via tailscale');
  });
  reg(['cat'], function (cmd) {
    if (cmd.indexOf('secret') > -1) {
      say('1. close a foldable.\n2. poke the clock.\n3. remember the code from old games.\n4. some channels only show static. wait.');
      say('that is all we will say.', 'dim');
    } else if (cmd.indexOf('pitch') > -1) say('Nothing to install on your Mac. Your Mac on your iPhone and iPad.');
    else say('cat: ' + cmd.slice(4) + ': no such file');
  });
  reg(['whoami'], function () { say(DT.prompt() === '#' ? 'root' : 'guest'); });
  reg(['date'], function () { say(new Date().toString()); });
  reg(['clear', 'cls'], function () { if (active) active.log.textContent = ''; });
  reg(['exit', 'logout'], function () {
    say('logout');
    say('[Process completed]', 'dim');
    var s = active;
    setTimeout(function () {
      DT.shell.close();
      if (s) { s.log.textContent = ''; s.input.blur(); }
      window.scrollTo(0, 0);
      DT.boot(true);
    }, still ? 300 : 900);
  });
  reg(['cd'], function () { say("you're already home."); });
  reg(['pwd'], function () { say('/home/guest/dumbterminal.app'); });
  reg(['ping'], function () { say('64 bytes from your mac: icmp_seq=0 time=3.1 ms\n(it misses you)'); });
  reg(['vim', 'vi', 'nano', 'emacs'], function () { say('you are now stuck in an editor. type :q to escape.'); });
  reg([':q', ':wq', ':q!'], function () { say('freedom.'); });
  reg(['rm'], function () { say('nice try.'); });
  reg(['man'], function () { say('see man dumbterminal, further down the page.'); });
  reg(['hello', 'hi', 'hey'], function () { say('hi. try help.'); });
  reg(['history'], function () { say(history.map(function (h, i) { return (i + 1) + '  ' + h; }).join('\n')); });
  reg(['uname'], function () { say('DumbTerminal ttys-web 1.0 (no kernel, just vibes)'); });

  // cursor: an odd character as the Terminal theme's pointer until the page is left (with a mouse or trackpad).
  var glyphs = ['§', '¶', 'Ж', 'Ψ', 'Ω', '∆', '∑', '∞', '≈', '⌘', '⌥', '⎋', '⏚', '☊', '♆', '⚚', '✣', '✺', '❖', '⟁',
    '⧖', 'ʘ', 'ϟ', 'Ѣ', '₪', '¤', '‡', '†', '※', '⁂', '⌬', '⏣', '⍟', '⎈', '☈', 'Ѫ', 'ᚠ', 'ᛟ', 'λ', 'µ', 'Þ', 'ƒ', '∂', '∫', '√', '◊', '⌖'];
  reg(['cursor', 'pointer'], function () {
    if (!window.matchMedia('(pointer: fine)').matches) { say('cursor: no pointer here. try it with a mouse.'); return; }
    if (document.documentElement.hasAttribute('data-theme')) { say('cursor: this theme brings its own. back on terminal, try again.'); return; }
    var sheet = Array.prototype.filter.call(document.styleSheets, function (x) { return /style\.css/.test(x.href || ''); })[0];
    if (!sheet) { say('cursor: not today.'); return; }
    var glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><text x='16' y='24' " +
      "text-anchor='middle' font-family='Menlo, monospace' font-size='24' font-weight='700' fill='#7CFF9B' stroke='#0A0F0A' " +
      "stroke-width='3' paint-order='stroke'>" + glyph + '</text></svg>';
    // Scoped to the Terminal theme, so switching themes brings back each theme's own pointer.
    try {
      sheet.insertRule('html:not([data-theme]) { --cursor: url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 16 16, auto; }',
        sheet.cssRules.length);
    } catch (e) { say('cursor: not today.'); return; }
    say('cursor: ' + glyph + ' until you leave. run it again for another.');
  });

  // sudo: plain sudo (or su) makes you root; anything else gets the old joke.
  reg(['sudo', 'su'], function (cmd) {
    if (cmd.indexOf('make') > -1 && cmd.indexOf('coffee') > -1) { say("make: *** No rule to make target 'coffee'."); return; }
    var plain = ['sudo', 'su', 'sudo su', 'sudo -i', 'sudo -s', 'sudo bash', 'sudo zsh'];
    if (plain.indexOf(cmd) < 0) {
      say('guest is not in the sudoers file. this incident will be reported.', 'err');
      say("(it won't. try plain sudo.)", 'dim');
      return;
    }
    say('[sudo] password for guest: ••••••', 'dim');
    say('root access granted.');
    DT.root();
  });

  // rain: falling characters for a few seconds.
  DT.rain = function () {
    if (still) { say('rain is off while Reduce Motion is on.', 'dim'); return; }
    if (document.querySelector('.rain')) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'rain';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var g = canvas.getContext('2d');
    var size = 16;
    var columns = Math.ceil(canvas.width / size);
    var drops = [];
    for (var i = 0; i < columns; i++) drops.push(Math.random() * -30);
    var glyphs = '0123456789ABCDEF<>/{}[]=+*%#';
    var color = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#7CFF9B';
    var frames = 0;
    var draw = function () {
      g.fillStyle = 'rgba(0, 0, 0, 0.16)';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.font = size + 'px ui-monospace, Menlo, monospace';
      g.fillStyle = color;
      for (var x = 0; x < columns; x++) {
        g.fillText(glyphs.charAt(Math.floor(Math.random() * glyphs.length)), x * size, drops[x] * size);
        drops[x] = drops[x] * size > canvas.height && Math.random() > 0.96 ? 0 : drops[x] + 1;
      }
      frames += 1;
      if (frames < 360) requestAnimationFrame(draw);
      else { canvas.classList.add('fade'); setTimeout(function () { canvas.remove(); }, 600); }
    };
    draw();
  };
  reg(['rain'], function () { say('it is raining characters.'); DT.rain(); });

  // Five quick taps on the logo make it rain too. On the home page the logo stops reloading the page.
  var brand = document.querySelector('.brand');
  if (brand) {
    var home = location.pathname === '/' || location.pathname === '/index.html';
    var taps = [];
    brand.addEventListener('click', function (e) {
      if (!home) return;
      e.preventDefault();
      var now = Date.now();
      taps = taps.filter(function (t) { return now - t < 1800; });
      taps.push(now);
      if (taps.length >= 5) { taps = []; if (!still) DT.rain(); }
      else if (taps.length === 1) window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    });
  }

  // life: cell life plays quietly behind the page; `life` again stops it.
  var lifeTimer = null;
  reg(['life'], function () {
    var existing = document.querySelector('.life');
    if (existing) { clearInterval(lifeTimer); existing.remove(); say('life stopped.'); return; }
    if (still) { say('life is off while Reduce Motion is on.', 'dim'); return; }
    var canvas = document.createElement('canvas');
    canvas.className = 'life';
    canvas.setAttribute('aria-hidden', 'true');
    var cell = 12;
    var cols = Math.ceil(window.innerWidth / cell);
    var rows = Math.ceil(window.innerHeight / cell);
    canvas.width = cols * cell;
    canvas.height = rows * cell;
    document.body.insertBefore(canvas, document.body.firstChild);
    var g = canvas.getContext('2d');
    var grid = [];
    for (var i = 0; i < cols * rows; i++) grid.push(Math.random() < 0.18 ? 1 : 0);
    var color = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#7CFF9B';
    var step = function () {
      var next = new Array(cols * rows);
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var n = 0;
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            if (dx || dy) n += grid[((y + dy + rows) % rows) * cols + (x + dx + cols) % cols];
          }
          var alive = grid[y * cols + x];
          next[y * cols + x] = n === 3 || (alive && n === 2) ? 1 : 0;
        }
      }
      grid = next;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = color;
      for (var k = 0; k < grid.length; k++) if (grid[k]) g.fillRect((k % cols) * cell + 1, Math.floor(k / cols) * cell + 1, cell - 2, cell - 2);
    };
    step();
    lifeTimer = setInterval(step, 140);
    say('life started. type life again to stop it.');
  });

  // For anyone who opens the browser's console.
  if (window.console) {
    console.log('%c> dumbterminal.app', 'color:#7CFF9B;font:bold 14px monospace');
    console.log('%cpoking around? press ~', 'color:#4FAF68;font:12px monospace');
  }
})();
