// Dumb Terminal's site, part 5: the app's colours from the command line. `theme` lists them and `theme red` switches;
// green, red, yellow and blue are open to all, and the rainbow is hidden behind one command. Switching plays the tube
// switch-off (unless Reduce Motion is on). The chosen colour stays in this browser; without storage the site simply
// stays green.
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT || !DT.shell) return;
  var say = DT.shell.say;
  var root = document.documentElement;

  var THEMES = { terminal: 'Green', red: 'Red', yellow: 'Yellow', blue: 'Blue', rainbow: 'Rainbow' };
  var aliases = { green: 'terminal', terminal: 'terminal', red: 'red', yellow: 'yellow', blue: 'blue', rainbow: 'rainbow' };

  var unlocked = function () {
    var have = ['terminal', 'red', 'yellow', 'blue'];
    return DT.get('dt-rainbow', '') === '1' ? have.concat(['rainbow']) : have;
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

  DT.shell.register(['theme', 'themes'], function (cmd) {
    var arg = cmd.split(' ').slice(1).join('-').replace(/["']/g, '');
    var have = unlocked();
    if (!arg) {
      say('themes:');
      Object.keys(THEMES).forEach(function (t) {
        var on = t === current() ? ' (on)' : '';
        say(have.indexOf(t) > -1 ? '  ' + THEMES[t].toLowerCase() + on : '  ???????');
      });
      if (have.indexOf('rainbow') < 0) say('one more is hidden in this shell. white light, split.', 'dim');
      say('switch with: theme <name>', 'dim');
      return;
    }
    var name = aliases[arg];
    if (!name) { say('theme: no such theme: ' + arg); return; }
    if (have.indexOf(name) < 0) { say('theme: ' + arg + ': not found. (yet)'); return; }
    apply(name);
  });

  // The hidden one: a prism splits white light into the rainbow.
  DT.shell.register(['prism'], function () {
    var fresh = unlocked().indexOf('rainbow') < 0;
    say('white light in. seven colours out.');
    if (fresh) {
      DT.set('dt-rainbow', '1');
      say('theme unlocked: rainbow. switching…');
    }
    setTimeout(function () { apply('rainbow'); }, DT.still() ? 0 : 500);
  });

  // Keep the browser's colour bar matching the theme chosen on an earlier visit.
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
})();
