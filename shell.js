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
    return line;
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
    if (cmd.indexOf('screen') > -1) { say('home.png   session.png   layouts.png   away.png'); return; }
    say('studio      home   ready\nmacmini     home   asleep\nmacbook     away   via tailscale');
  });
  reg(['cat'], function (cmd) {
    if (cmd.indexOf('secret') > -1) printSecrets();
    else if (cmd.indexOf('pitch') > -1) {
      // Today's headline (it changes each visit), then the line under it.
      // toy.js may have split the headline into glowing letters; its screen-reader copy holds the plain text.
      var h1 = document.querySelector('.hero h1');
      var plain = h1 && (h1.querySelector('.sr-only') || h1);
      var tag = document.querySelector('.hero .tagline');
      say((plain ? plain.textContent.replace(/\u00a0/g, ' ').trim() + ' ' : '') + (tag ? tag.textContent : ''));
    }
    // The hunt: the app's mail says "try 0x2a online". The word is in the 4th App Store picture, in Morse.
    else if (cmd === 'cat 0x2a' || cmd === 'cat 42') { say('# the 4th picture.\n# read the lines.'); say('(on the app store. then tell the app.)', 'dim'); }
    else say('cat: ' + cmd.slice(4) + ': no such file');
  });
  // ---- secrets.txt (owner's pick 2026-11-26, "A · Bad sectors"): every hidden thing in the app and on this page.
  // Four lines read; the rest have rotted. fsck, degauss, plain sudo and fsck -y bring them back. The last line is shy
  // and comes out for a word the app gives once its own copy is fixed (and the app's for the word this page gives).
  // The app has the same file and replies (SecretsFile.swift): keep secretLines in step with SecretsFile.lines.
  // Progress is kept in this browser only. ----
  var secretLines = [
    "shake your phone mid-session. your mac waves back.",
    "at 4:04, home can't find itself.",
    "site: poke the clock.",
    "site: remember the code from old games.",
    "pinch open the greeting. keep going.",
    "on home, hold the phone to your ear. 300 baud.",
    "phone face down. the tube sleeps.",
    "take a screenshot. we notice.",
    "leave a session alone for 3 minutes. watch the corners.",
    "stay 10 minutes, then leave. look back.",
    "fri 15 jan 2027, 08:00 utc. be awake.",
    "two phones, one wi-fi, both on home.",
    "leave mid-session. look at the island.",
    "0x2a. the 4th picture. read the lines.",
    "during setup, the pretend mac's trash is full.",
    "during setup, tap a blinking cursor.",
    "during setup, tap the ttys number. again. again.",
    "don't touch home for 54 seconds.",
    "two hours in one session. the screen remembers.",
    "end a session in every colour. then swipe like it's 1986.",
    "close a foldable. the outside has games.",
    "tap the version number five times.",
    "say no to the local network. we won't take it well.",
    "tap the greeting three times.",
    "the last line of settings is someone.",
    "some words misfire. watch long enough.",
    "site: some channels only show static. wait.",
    "site: tap the logo five times. bring an umbrella.",
    "site: type life. then type it again.",
    "site: type cursor, with a mouse.",
    "plain sudo works. fancy sudo doesn't.",
    "site: some words repaint the whole page.",
    "site: tune the tv.",
    "site: type exit. come back.",
    "you fixed both ends. no prize. just this line."
  ];
  var OPEN = 4, DEG = 8, SHY = secretLines.length - 1, APP_WORD = 'coax', SITE_WORD = 'psst';
  var CHECKED = 1, DEGAUSSED = 2, FIXED = 4, SHY_OUT = 8;
  var GLYPHS = '▒░▓#%&@$*';
  var progress = parseInt(DT.get('dt-secrets', '0'), 10) || 0;
  var rotten = [];      // printed lines still broken: { el, i }
  var flicker = null;
  var mark = function (bit) { progress |= bit; DT.set('dt-secrets', String(progress)); };
  var has = function (bit) { return (progress & bit) === bit; };
  var isRoot = function () { return DT.prompt() === '#'; };
  var readable = function (i) {
    return i < OPEN || (has(DEGAUSSED) && i < OPEN + DEG) || (has(FIXED) && i < SHY) || (has(SHY_OUT) && i === SHY);
  };
  var unreadable = function () { return secretLines.filter(function (s, i) { return !readable(i); }).length; };
  var num = function (i) { return DT.pad(i + 1) + '  '; };
  var glyph = function () { return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); };
  var rot = function (i) {
    return secretLines[i].split('').map(function (c) { return /[a-z0-9]/i.test(c) && Math.random() < 0.55 ? glyph() : c; }).join('');
  };
  var footer = function () {
    var n = unreadable();
    if (n === 1) say("# 1 line left. it isn't broken. it's shy.", 'dim');
    else if (n > 1) { say('# ' + n + ' lines unreadable. bad sectors.', 'dim'); say('# files this old need a check-up.', 'dim'); }
  };
  // The rot flickers: now and then a letter shows through or sinks back.
  var startFlicker = function () {
    if (flicker || still) return;
    flicker = setInterval(function () {
      rotten = rotten.filter(function (r) { return document.contains(r.el); });
      if (!rotten.length) { clearInterval(flicker); flicker = null; return; }
      if (document.hidden) return;
      rotten.forEach(function (r) {
        if (Math.random() > 0.3) return;
        var line = secretLines[r.i], k = Math.floor(Math.random() * line.length);
        if (!/[a-z0-9]/i.test(line.charAt(k))) return;
        var t = r.el.textContent.split(''), at = num(r.i).length + k;
        t[at] = Math.random() < 0.5 ? line.charAt(k) : glyph();
        r.el.textContent = t.join('');
      });
    }, 220);
  };
  var printSecrets = function () {
    secretLines.forEach(function (s, i) {
      var ok = readable(i);
      var el = say(num(i) + (ok ? s : rot(i)), ok ? '' : 'rot');
      if (!ok && el) rotten.push({ el: el, i: i });
    });
    footer();
    startFlicker();
  };
  // Lines that came back type themselves back in place, left to right.
  var heal = function (list) {
    var order = 0;
    rotten = rotten.filter(function (r) {
      if (list.indexOf(r.i) < 0) return true;
      var el = r.el, fin = num(r.i) + secretLines[r.i], from = el.textContent;
      el.className = 'fresh';
      var start = Date.now() + order++ * 40;
      var step = function () {
        var p = still ? 1 : Math.max(0, Math.min(1, (Date.now() - start) / 450));
        var cut = Math.floor(p * fin.length);
        el.textContent = fin.slice(0, cut) + from.slice(cut);
        if (p < 1) requestAnimationFrame(step);
        else setTimeout(function () { el.className = ''; }, 900);
      };
      step();
      return false;
    });
  };
  var range = function (from, to) { var a = []; for (var i = from; i < to; i++) a.push(i); return a; };
  // On the page's content, not body: a transform on body would move the fixed shell panel with it.
  var degaussPage = function () {
    var tube = document.querySelector('main');
    if (still || !tube) return;
    tube.classList.remove('degauss');
    void tube.offsetWidth;
    tube.classList.add('degauss');
    setTimeout(function () { tube.classList.remove('degauss'); }, 950);
  };
  reg(['fsck'], function (cmd) {
    var c = cmd.replace(/["']/g, '');
    var plain = c === 'fsck' || c === 'fsck secrets.txt';
    var yes = ['fsck -y', 'fsck -y secrets.txt', 'fsck secrets.txt -y', 'fsck -fy secrets.txt', 'fsck -yf secrets.txt'].indexOf(c) > -1;
    var n = unreadable();
    if (plain) {
      if (!has(DEGAUSSED)) {
        mark(CHECKED);
        say('** checking secrets.txt\n** ' + n + " bad sectors found. cause: magnetism.\n** the tube's own, or a fridge magnet. we're not judging.");
        say('# old tubes had a button for this. it went thunk.', 'dim');
      } else if (!has(FIXED)) {
        say('** ' + n + ' bad sectors left. the deep kind, in swap.');
        say('# swap belongs to root. and fsck can be told to just say yes.', 'dim');
      } else say(n ? '** 0 bad sectors. 1 shy line. not a disk problem.' : '** 0 bad sectors. nothing left to fix.');
      return;
    }
    if (!yes) { say('fsck: ' + c.slice(5) + ': not a disk. the broken one is secrets.txt.', 'err'); return; }
    if (!isRoot()) { say('fsck: -y fixes things without asking. only root gets to be that confident.', 'err'); return; }
    if (!has(DEGAUSSED)) { say("fsck: sectors won't hold while the tube's still magnetised. fix the picture first.", 'err'); return; }
    if (has(FIXED)) { say('fsck: nothing left to say yes to.'); return; }
    var healed = range(OPEN, SHY).filter(function (i) { return !readable(i); });
    mark(CHECKED | FIXED);
    say('fix sector 0x0C? y\nfix sector 0x0D? y\nfix sector 0x0E? y y y y y y y y y y y y y y y y y y y');
    say("you're very agreeable.", 'dim');
    heal(healed);
    say(healed.length + ' lines fixed. line ' + DT.pad(SHY + 1) + " isn't broken. it's shy.");
    say('# it comes out for a word. the app has the word.', 'dim');
    if (!has(SHY_OUT)) say("# and the app's own line " + DT.pad(SHY + 1) + ' comes out for: ' + APP_WORD, 'dim');
  });
  reg(['degauss'], function () {
    if (!has(CHECKED)) { say('degauss: of what? check the disk first.', 'err'); return; }
    if (has(DEGAUSSED)) { say('already degaussed. any more and the screen goes purple.'); return; }
    mark(DEGAUSSED);
    degaussPage();
    say('*thunk*');
    heal(range(OPEN, OPEN + DEG));
    say(DEG + ' lines came back. ' + unreadable() + ' are stuck deeper, in swap.');
    say('# swap belongs to root.', 'dim');
  });
  reg([SITE_WORD], function () {
    if (has(SHY_OUT)) { say("it's already out. it waves, a bit."); return; }
    if (!has(FIXED)) { say('…line ' + DT.pad(SHY + 1) + " won't come out while the others are still broken.", 'dim'); return; }
    mark(SHY_OUT);
    heal([SHY]);
    say('…ok. line ' + DT.pad(SHY + 1) + ' comes out.');
  });
  reg([APP_WORD], function () { say(APP_WORD + ': that word is for the app.', 'dim'); });
  reg(['hint'], function () {
    say(!has(CHECKED) ? '# disks get check-ups. fsck.'
      : !has(DEGAUSSED) ? '# old tubes had a button for this. it went thunk.'
      : !has(FIXED) ? (isRoot() ? '# fsck again, and say yes to everything. -y' : '# swap belongs to root.')
      : !has(SHY_OUT) ? '# the shy one wants a word. the app has it.'
      : "# all of them. there's nothing left to find in here.", 'dim');
  });
  reg(['thunk'], function () { say("close. the button's called degauss."); });
  reg(['magnet', 'magnets'], function () { say('put the magnet down.'); });

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
  reg(['rm'], function (cmd) { say(cmd.indexOf('secret') > -1 ? 'and lose ' + secretLines.length + ' secrets? bold. no.' : 'nice try.'); });
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
