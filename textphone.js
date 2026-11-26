// Dumb Terminal's site, part 8: the hero's iPhone, drawn in text. The Mac's screen (characters made from the session
// screenshot) sits above the trackpad, as in the app. A fingertip `o` glides on the trackpad leaving a dotted trail,
// and an arrow moves on the Mac above it: move, tap to click, two fingers to scroll. The bottom edge says which.
// Decoration only: the figure has one plain description for screen readers. Still with Reduce Motion, and it only
// runs while it is on screen.
(function () {
  'use strict';
  var DT = window.DT;
  var pre = document.querySelector('.textphone pre');
  if (!DT || !pre || DT.still()) return;

  var lines = pre.textContent.split('\n');
  var art = pre.getAttribute('data-art').split(',').map(Number);   // first row, row count
  var pad = pre.getAttribute('data-pad').split(',').map(Number);
  var width = lines[0].length;
  var artW = width - 4;                                             // "│ " + art + " │"
  var padW = width - 6;                                             // "│ ┆" + inside + "┆ │"
  var padH = pad[1] - 2;

  // The pointer's tour, in 0..1 across the Mac's screen. Each leg takes 1.3 s; `say` is what the finger is doing.
  var tour = [
    { x: 0.78, y: 0.62, say: 'move' }, { x: 0.3, y: 0.3, say: 'move' }, { x: 0.3, y: 0.3, say: 'tap = click', tap: true },
    { x: 0.18, y: 0.4, say: 'two fingers = scroll', two: true }, { x: 0.18, y: 0.6, say: 'two fingers = scroll', two: true },
    { x: 0.2, y: 0.92, say: 'move' }, { x: 0.2, y: 0.92, say: 'tap = click', tap: true }, { x: 0.55, y: 0.95, say: 'move' }
  ];
  var LEG = 1300;
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  // One character cell each: box lines and symbols wear <i> (see style.css) so fallback fonts can't widen them.
  var esc = function (ch) {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    return ch.charCodeAt(0) > 127 ? '<i>' + ch + '</i>' : ch;
  };
  var span = function (cls, ch) { return '<span class="' + cls + '">' + esc(ch) + '</span>'; };

  var trail = [];
  var flash = 0;
  var lastTap = -1;
  var start = 0;

  var draw = function (now) {
    var t = (Math.max(0, now - start) / LEG) % tour.length;
    var i = Math.floor(t);
    var f = ease(t - i);
    var a = tour[i];
    var b = tour[(i + 1) % tour.length];
    var x = a.x + (b.x - a.x) * f;
    var y = a.y + (b.y - a.y) * f;
    if (b.tap && f > 0.97 && lastTap !== i) { lastTap = i; flash = 5; }
    if (flash > 0) flash -= 1;

    var cells = lines.map(function (l) { return l.split('').map(esc); });
    // The pointer on the Mac.
    var px = 2 + Math.round(x * (artW - 1));
    var py = art[0] + Math.round(y * (art[1] - 1));
    cells[py][px] = span('tp-arrow', flash ? '✱' : '↖');
    // The finger on the trackpad, its trail, and a second finger while scrolling.
    var fx = 3 + Math.round(x * (padW - 1));
    var fy = pad[0] + 1 + Math.round(y * (padH - 1));
    trail.push([fx, fy]);
    if (trail.length > 10) trail.shift();
    trail.forEach(function (p, k) {
      if (k < trail.length - 1) cells[p[1]][p[0]] = span('tp-trail', k > 5 ? ':' : '·');
    });
    cells[fy][fx] = span('tp-ptr', flash ? 'O' : 'o');
    if (b.two && fx + 3 < width - 3) cells[fy][fx + 3] = span('tp-ptr', 'o');
    // What the finger is doing, set into the bottom edge.
    var say = ' ' + b.say + ' ';
    var bottom = cells.length - 1;
    var from = Math.floor((width - say.length) / 2);
    for (var c = 0; c < say.length; c += 1) cells[bottom][from + c] = c === 0 || c === say.length - 1 ? ' ' : span('tp-say', say[c]);

    pre.innerHTML = cells.map(function (r) { return r.join(''); }).join('\n');
  };

  var timer = null;
  var run = function (on) {
    if (on && !timer) {
      if (!start) start = performance.now();
      timer = setInterval(function () { draw(performance.now()); }, 70);
    } else if (!on && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
  var visible = true;
  var update = function () { run(visible && !document.hidden); };
  document.addEventListener('visibilitychange', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; update(); }).observe(pre);
  }
  update();
})();
