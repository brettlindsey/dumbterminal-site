// Dumb Terminal's site: a typed hero, sections that fade up as they scroll in, and a few things to find.
(function () {
  'use strict';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The hero terminal types its script. Lines starting with "$" are commands, "|" quiet output, "!" the payoff.
  var term = document.querySelector('.term-body[data-script]');
  if (term) {
    var lines = term.getAttribute('data-script').split('\n');
    var render = function (line) {
      var span = document.createElement('span');
      var kind = line.charAt(0);
      if (kind === '$') span.className = 'cmd';
      if (kind === '!') { span.className = 'ok'; line = line.slice(1); }
      if (kind === '|') { line = line.slice(1); }
      span.textContent = line;
      return span;
    };
    var cursor = document.createElement('span');
    cursor.className = 'cursor';
    if (still) {
      lines.forEach(function (line, i) {
        term.appendChild(render(line));
        if (i < lines.length - 1) term.appendChild(document.createTextNode('\n'));
      });
      term.appendChild(cursor);
    } else {
      var lineIndex = 0;
      var typeLine = function () {
        if (lineIndex >= lines.length) { term.appendChild(cursor); return; }
        var raw = lines[lineIndex];
        var span = render('');
        var kind = raw.charAt(0);
        span.className = kind === '$' ? 'cmd' : kind === '!' ? 'ok' : '';
        var text = kind === '!' || kind === '|' ? raw.slice(1) : raw;
        term.appendChild(span);
        term.appendChild(cursor);
        var c = 0;
        var isCommand = kind === '$';
        var tick = function () {
          span.textContent = text.slice(0, ++c);
          if (c < text.length) {
            setTimeout(tick, isCommand ? 55 + Math.random() * 60 : 12);
          } else {
            lineIndex += 1;
            if (lineIndex < lines.length) term.insertBefore(document.createTextNode('\n'), cursor);
            setTimeout(typeLine, isCommand ? 420 : 160);
          }
        };
        setTimeout(tick, isCommand ? 300 : 80);
      };
      setTimeout(typeLine, 500);
    }
  }

  // Sections fade up once as they scroll into view.
  var reveals = document.querySelectorAll('.reveal');
  if (still || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); seen.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { seen.observe(el); });
  }

  // ---- Things to find ----

  // A shell: press ~ anywhere, or click the prompt in the footer.
  var shell = null;
  var log = null;
  var input = null;
  var say = function (text) {
    log.textContent += (log.textContent ? '\n' : '') + text;
    log.scrollTop = log.scrollHeight;
  };
  var openShell = function () {
    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'shell';
      shell.setAttribute('role', 'dialog');
      shell.setAttribute('aria-label', 'A little shell. Type help.');
      log = document.createElement('div');
      log.className = 'shell-log';
      var row = document.createElement('label');
      row.className = 'shell-line';
      row.textContent = '% ';
      input = document.createElement('input');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('aria-label', 'Command');
      row.appendChild(input);
      shell.appendChild(log);
      shell.appendChild(row);
      document.body.appendChild(shell);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { shell.hidden = true; return; }
        if (e.key !== 'Enter') return;
        var cmd = input.value.trim();
        input.value = '';
        if (cmd) { say('% ' + cmd); run(cmd); }
      });
      say('dumbterminal.app shell. type help.');
    }
    shell.hidden = false;
    input.focus();
  };
  var run = function (cmd) {
    var c = cmd.toLowerCase();
    if (c === 'help') say('commands: ls, whoami, date, ping mac, cat secrets.txt, sudo make coffee, rain, clear, exit');
    else if (c === 'ls') say('macmini.local   studio.local   secrets.txt');
    else if (c === 'whoami') say(document.body.classList.contains('root') ? 'root' : 'guest');
    else if (c === 'date') say(new Date().toString());
    else if (c.indexOf('ping') === 0) say('64 bytes from your mac: time=3 ms\n(it misses you)');
    else if (c === 'cat secrets.txt') say('1. close a foldable.\n2. poke the clock.\n3. remember the code from old games.\nthat is all we will say.');
    else if (c === 'sudo make coffee') say("make: *** No rule to make target 'coffee'.");
    else if (c === 'sudo su' || c === 'su' || c === 'sudo -i' || c === 'root') say('nice try. root access is $4.99, in the app.');
    else if (c.indexOf('sudo') === 0) say('guest is not in the sudoers file. this incident will be reported.');
    else if (c === 'rain' || c === 'matrix') rain();
    else if (c === 'clear') log.textContent = '';
    else if (c === 'exit' || c === 'logout') { shell.hidden = true; }
    else if (c === 'rm -rf /') say('nice try.');
    else say('dt: command not found: ' + cmd);
  };
  var hint = document.querySelector('.shell-hint');
  if (hint) {
    hint.addEventListener('click', openShell);
    hint.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openShell(); } });
  }
  document.addEventListener('keydown', function (e) {
    var typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (!typing && e.key === '~') { e.preventDefault(); openShell(); }
  });

  // Falling characters for a few seconds.
  var rain = function () {
    if (still || document.querySelector('.rain')) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'rain';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var g = canvas.getContext('2d');
    var size = 16;
    var columns = Math.ceil(canvas.width / size);
    var drops = [];
    for (var i = 0; i < columns; i++) drops.push(Math.random() * -40);
    var glyphs = '0123456789ABCDEF<>/{}[]=+*$#%';
    var frames = 0;
    var draw = function () {
      g.fillStyle = 'rgba(5, 8, 5, 0.18)';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.font = size + 'px ui-monospace, Menlo, monospace';
      for (var x = 0; x < columns; x++) {
        g.fillStyle = Math.random() < 0.05 ? '#d8ffe0' : '#5cbf78';
        g.fillText(glyphs.charAt(Math.floor(Math.random() * glyphs.length)), x * size, drops[x] * size);
        drops[x] = drops[x] * size > canvas.height && Math.random() > 0.97 ? 0 : drops[x] + 1;
      }
      frames += 1;
      if (frames < 240) requestAnimationFrame(draw);
      else canvas.remove();
    };
    draw();
  };

  // Click the logo five times quickly.
  var brand = document.querySelector('.brand img');
  if (brand) {
    var taps = [];
    brand.addEventListener('click', function (e) {
      var now = Date.now();
      taps = taps.filter(function (t) { return now - t < 1800; });
      taps.push(now);
      if (taps.length >= 5) { e.preventDefault(); taps = []; rain(); }
    });
  }

  // The code from old games: up, up, down, down, left, right, left, right, b, a.
  var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var progress = 0;
  document.addEventListener('keydown', function (e) {
    progress = e.key === code[progress] ? progress + 1 : (e.key === code[0] ? 1 : 0);
    if (progress < code.length) return;
    progress = 0;
    document.body.classList.add('glitch', 'root');
    setTimeout(function () {
      document.body.classList.remove('glitch');
      openShell();
      say('!! PANIC 0x0D1E: SITE_TOO_RETRO\n...just kidding. you are now root (on this page).');
    }, still ? 0 : 2100);
  });

  if (window.console) {
    console.log('%c> dumbterminal.app', 'color:#7CFF9B;font:bold 14px monospace');
    console.log('%cpoking around? press ~', 'color:#5cbf78;font:12px monospace');
  }
})();
