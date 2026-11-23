// Dumb Terminal's site, part 5: themes you unlock from the command line. Each one is a hidden command; `theme` lists
// what you've found. Switching plays the tube switch-off (unless Reduce Motion is on). Unlocks and the chosen
// theme stay in this browser; without storage the site simply stays in Terminal.
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT || !DT.shell) return;
  var say = DT.shell.say;
  var root = document.documentElement;

  var THEMES = {
    terminal: 'Terminal',
    basic: 'Retro Basic',
    bios: 'BIOS Setup',
    neon: 'Neon Grid',
    lcd: 'Pocket LCD'
  };
  var aliases = { 'retro-basic': 'basic', 'retro': 'basic', 'basic': 'basic', 'bios': 'bios', 'bios-setup': 'bios', 'setup': 'bios',
                  'neon': 'neon', 'neon-grid': 'neon', 'lcd': 'lcd', 'pocket-lcd': 'lcd', 'pocket': 'lcd', 'terminal': 'terminal' };

  var unlocked = function () {
    var list = (DT.get('dt-unlocked', '') || '').split(',').filter(function (t) { return THEMES[t]; });
    return ['terminal'].concat(list.filter(function (t) { return t !== 'terminal'; }));
  };
  var current = function () { return root.getAttribute('data-theme') || 'terminal'; };

  var setTheme = function (name) {
    if (name === 'terminal') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', name);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    DT.set('dt-theme', name);
  };

  // The tube switch-off: collapse to a line, switch, then light up again.
  var apply = function (name) {
    if (name === current()) { say('already on ' + THEMES[name].toLowerCase() + '.'); return; }
    if (DT.still()) { setTheme(name); return; }
    var tube = document.createElement('div');
    tube.className = 'tube off';
    tube.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tube);
    setTimeout(function () {
      setTheme(name);
      tube.className = 'tube on';
      setTimeout(function () { tube.remove(); }, 480);
    }, 440);
  };

  var unlock = function (name, lines) {
    var have = unlocked();
    var fresh = have.indexOf(name) < 0;
    lines.forEach(function (l) { say(l); });
    if (fresh) {
      DT.set('dt-unlocked', have.concat([name]).filter(function (t) { return t !== 'terminal'; }).join(','));
      say('theme unlocked: ' + THEMES[name].toLowerCase() + '. switching…');
    }
    setTimeout(function () { apply(name); }, DT.still() ? 0 : 500);
  };

  DT.shell.register(['theme', 'themes'], function (cmd) {
    var arg = cmd.split(' ').slice(1).join('-').replace(/["']/g, '');
    var have = unlocked();
    if (!arg) {
      say('themes:');
      Object.keys(THEMES).forEach(function (t) {
        var on = t === current() ? ' (on)' : '';
        say(have.indexOf(t) > -1 ? '  ' + THEMES[t].toLowerCase() + on : '  ????????');
      });
      var left = Object.keys(THEMES).length - have.length;
      if (left) say(left + ' more ' + (left === 1 ? 'is' : 'are') + ' hidden in this shell. one of them likes coins.', 'dim');
      say('switch with: theme <name>', 'dim');
      return;
    }
    var name = aliases[arg];
    if (!name) { say('theme: no such theme: ' + arg); return; }
    if (have.indexOf(name) < 0) { say('theme: ' + arg + ': not found. (yet)'); return; }
    apply(name);
  });

  // The hidden commands, one per theme.
  DT.shell.register(['load'], function (cmd) {
    if (cmd.indexOf('basic') < 0) { say('?FILE NOT FOUND ERROR'); return; }
    unlock('basic', ['SEARCHING FOR BASIC', 'LOADING', 'READY.']);
  });
  DT.shell.register(['setup', 'bios'], function () {
    unlock('bios', ['Entering Setup...', 'Main  Advanced  Boot  [Exit]', 'Load Setup Defaults ......... [OK]']);
  });
  DT.shell.register(['insert coin', 'insert'], function (cmd) {
    if (cmd.indexOf('coin') < 0) { say('insert what?'); return; }
    unlock('neon', ['*clink*', 'CREDIT 1', 'PLAYER 1 READY']);
  });
  DT.shell.register(['coin'], function () { say('insert one?'); });
  DT.shell.register(['press start', 'press'], function (cmd) {
    if (cmd.indexOf('start') < 0) { say('press what?'); return; }
    unlock('lcd', ['▶ START', 'NEW GAME', 'SAVE FILE CREATED']);
  });
  DT.shell.register(['start'], function () { say('press it.'); });

  // Neon Grid's pointer leaves a short glowing trail (mouse only, motion on).
  var fine = window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    var dots = [];
    var next = 0;
    var lastT = 0;
    window.addEventListener('pointermove', function (e) {
      if (current() !== 'neon' || DT.still()) return;
      var now = performance.now();
      if (now - lastT < 28) return;
      lastT = now;
      if (dots.length < 7) {
        var d = document.createElement('div');
        d.className = 'trail';
        d.setAttribute('aria-hidden', 'true');
        document.body.appendChild(d);
        dots.push(d);
      }
      var dot = dots[next % dots.length];
      next += 1;
      dot.style.transition = 'none';
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
      dot.style.opacity = '0.9';
      dot.style.transform = 'scale(1)';
      requestAnimationFrame(function () {
        dot.style.transition = '';
        dot.style.opacity = '0';
        dot.style.transform = 'scale(0.3)';
      });
    }, { passive: true });
  }

  // Keep the browser's colour bar matching the theme chosen on an earlier visit.
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
})();
