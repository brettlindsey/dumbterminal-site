// Dumb Terminal's site, part 3: a small command line. Press / or ~, or click any blinking cursor. `help` lists a few
// commands; the rest are for finding. Other scripts add commands with DT.shell.register().
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT) return;

  var panel = null;
  var log = null;
  var input = null;
  var promptLabel = null;
  var opener = null;
  var history = [];
  var historyIndex = 0;
  var commands = {};

  var say = function (text, cls) {
    if (!log) return;
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };

  var build = function () {
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

    log = document.createElement('div');
    log.className = 'shell-log';
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');

    var form = document.createElement('form');
    form.className = 'shell-line';
    form.setAttribute('autocomplete', 'off');
    var label = document.createElement('label');
    label.setAttribute('for', 'shell-input');
    label.className = 'sr-only';
    label.textContent = 'Command. Type help for a list.';
    promptLabel = document.createElement('span');
    promptLabel.setAttribute('aria-hidden', 'true');
    input = document.createElement('input');
    input.id = 'shell-input';
    input.type = 'text';
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'go');
    form.appendChild(label);
    form.appendChild(promptLabel);
    form.appendChild(input);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cmd = input.value.trim();
      input.value = '';
      if (!cmd) return;
      history.push(cmd);
      historyIndex = history.length;
      say(DT.prompt() + ' ' + cmd, 'echo');
      run(cmd);
      promptLabel.textContent = DT.prompt() + ' ';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); DT.shell.close(); }
      if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); historyIndex = Math.max(0, historyIndex - 1); input.value = history[historyIndex]; }
      if (e.key === 'ArrowDown' && history.length) { e.preventDefault(); historyIndex = Math.min(history.length, historyIndex + 1); input.value = history[historyIndex] || ''; }
    });

    panel.appendChild(bar);
    panel.appendChild(log);
    panel.appendChild(form);
    document.body.appendChild(panel);
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
      if (!panel) build();
      opener = from || document.activeElement;
      promptLabel.textContent = DT.prompt() + ' ';
      panel.hidden = false;
      input.focus();
    },
    close: function () {
      if (!panel) return;
      panel.hidden = true;
      if (opener && opener.focus) opener.focus();
    },
    isOpen: function () { return panel && !panel.hidden; }
  };

  // Openers: / or ~ (or `) anywhere you aren't typing, and every blinking cursor.
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/' || e.key === '~' || e.key === '`') { e.preventDefault(); DT.shell.open(); }
  });
  document.querySelectorAll('[data-shell]').forEach(function (b) {
    b.addEventListener('click', function () { DT.shell.open(b); });
  });

  // ---- The commands ----
  var reg = DT.shell.register;
  reg(['help', '?'], function () {
    say('help     this list\nls ~/macs  your macs\nwhoami   who you are\ndate     what time it is\nclear    clean screen\nexit     log out');
    say('(there are more. some of them change the whole page.)', 'dim');
  });
  reg(['ls'], function (cmd) {
    if (cmd === 'ls' || cmd === 'ls ~' || cmd === 'ls ~/') { say('macs/   pitch.txt   secrets.txt'); return; }
    say('studio      home   ready\nmacmini     home   asleep\nmacbook     away   via tailscale');
  });
  reg(['cat'], function (cmd) {
    if (cmd.indexOf('secret') > -1) say('nice try.\nthe app keeps its secrets on the phone.\nthis page keeps some in this shell.');
    else if (cmd.indexOf('pitch') > -1) say('Nothing to install on your Mac. Your Mac on your iPhone and iPad.');
    else say('cat: ' + cmd.slice(4) + ': no such file');
  });
  reg(['whoami'], function () { say(DT.prompt() === '#' ? 'root' : 'guest'); });
  reg(['date'], function () { say(new Date().toString()); });
  reg(['clear', 'cls'], function () { log.textContent = ''; });
  reg(['exit', 'logout'], function () {
    say('logout');
    say('[Process completed]', 'dim');
    setTimeout(function () {
      DT.shell.close();
      log.textContent = '';
      window.scrollTo(0, 0);
      DT.boot(true);
    }, DT.still() ? 300 : 900);
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

  // sudo: the prompt turns to # and the page says so, with a way to the beta.
  reg(['sudo', 'su'], function (cmd) {
    if (cmd.indexOf('make') > -1 && cmd.indexOf('coffee') > -1) { say("make: *** No rule to make target 'coffee'."); return; }
    if (cmd.indexOf('rm') > -1) { say('nice try.'); return; }
    document.documentElement.classList.add('root');
    say('[sudo] password for guest: ••••••', 'dim');
    say('root access granted.');
    if (!document.querySelector('.root-banner')) {
      var banner = document.createElement('div');
      banner.className = 'root-banner';
      banner.setAttribute('role', 'status');
      var text = document.createElement('span');
      text.textContent = '# root access granted. ';
      var link = document.createElement('a');
      link.href = '#beta';
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
    }
  });

  // rain: falling characters for a few seconds.
  DT.rain = function () {
    if (DT.still()) { say('rain is off while Reduce Motion is on.', 'dim'); return; }
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

  // life: cell life plays quietly behind the page; `life` again stops it.
  var lifeTimer = null;
  reg(['life'], function () {
    var existing = document.querySelector('.life');
    if (existing) { clearInterval(lifeTimer); existing.remove(); say('life stopped.'); return; }
    if (DT.still()) { say('life is off while Reduce Motion is on.', 'dim'); return; }
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
})();
