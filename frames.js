// Dumb Terminal's site, part 7: the frames around the app's screenshots. Each visit picks one of five, never the
// same twice in a row, and both phone screenshots wear it (the hero's iPhone is drawn in text by textphone.js): a
// terminal window, a phone drawn in box characters, a little CRT, a camera viewfinder, or a point of light tracing the edge. Without JavaScript the screenshots keep
// their plain outline; with Reduce Motion the frames stay but nothing moves.
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT) return;

  var names = ['win', 'ascii', 'crt', 'finder', 'trace'];
  // `?frame=crt` shows one on purpose (scripts/site-check.mjs walks through all five this way).
  var asked = new URLSearchParams(location.search).get('frame');
  var last = DT.session('dt-frame');
  var pool = names.filter(function (n) { return n !== last; });
  var frame = names.indexOf(asked) >= 0 ? asked : pool[Math.floor(Math.random() * pool.length)];
  DT.session('dt-frame', frame);
  DT.frame = frame;

  // What each screenshot is called, for the window title, the drawn label and the viewfinder readout.
  var spots = [
    { el: document.querySelector('.phone[data-intro]'), spot: 'phone', file: 'home.png', size: '402×874', tty: 'ttys004', dev: 'iphone' },
    { el: document.querySelector('.phone[data-modem]'), spot: 'phone', file: 'away.png', size: '402×874', tty: 'ttys004', dev: 'iphone' }
  ].filter(function (s) { return s.el; });

  var make = function (tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    el.setAttribute('aria-hidden', 'true');
    return el;
  };
  var repeat = function (s, n) { return new Array(n + 1).join(s); };
  var clock = function () { var d = new Date(); return d.getHours() + ':' + DT.pad(d.getMinutes()); };
  var svgNS = 'http://www.w3.org/2000/svg';

  var dress = {
    // A · a terminal window titled with the screenshot's file name.
    win: function (box, s) {
      var bar = make('div', 'frame-bar');
      bar.appendChild(make('b', '', s.file));
      bar.appendChild(make('span', 'frame-size', s.size));
      box.insertBefore(bar, box.firstChild);
      box.appendChild(make('div', 'frame-foot', s.tty + ' · iPhone'));
    },
    // B · the device drawn in box characters, camera and side buttons included.
    ascii: function (box, s) {
      box.appendChild(make('span', 'fa fa-t', repeat('─', 300)));
      box.appendChild(make('span', 'fa fa-b', repeat('─', 300)));
      box.appendChild(make('span', 'fa fa-l', repeat('│\n', 160)));
      box.appendChild(make('span', 'fa fa-r', repeat('│\n', 160)));
      [['tl', '╭'], ['tr', '╮'], ['bl', '╰'], ['br', '╯']].forEach(function (c) { box.appendChild(make('span', 'fa-c fa-' + c[0], c[1])); });
      box.appendChild(make('span', 'fa-on fa-cam', '( ● )'));
      box.appendChild(make('span', 'fa-on fa-name', 'tty.' + s.dev));
      ['fa-k1', 'fa-k2', 'fa-k3', 'fa-k4'].forEach(function (k) { box.appendChild(make('span', 'fa-on fa-key ' + k, '┃\n┃\n┃')); });
    },
    // C · a phone-shaped tube: curved glass, scan lines (on the screenshot itself), a model plate and a power light.
    crt: function (box) {
      box.appendChild(make('span', 'frame-plate', 'DT-17'));
      box.appendChild(make('span', 'frame-led'));
    },
    // E · no bezel: four corner marks and a small readout, like a camera locked on the screen.
    finder: function (box, s) {
      ['a', 'b', 'c', 'd'].forEach(function (k) { box.appendChild(make('i', 'fv fv-' + k)); });
      var top = make('div', 'fv-read fv-top');
      top.appendChild(make('span', '', 'tty.' + s.dev));
      top.appendChild(make('span', '', '1×'));
      var bot = make('div', 'fv-read fv-bot');
      bot.appendChild(make('span', 'fv-live', 'live'));
      var time = make('span', '', clock());
      bot.appendChild(time);
      box.appendChild(top);
      box.appendChild(bot);
      var tick = function () { time.textContent = clock(); setTimeout(tick, 60000 - Date.now() % 60000); };
      setTimeout(tick, 60000 - Date.now() % 60000);
    },
    // G · a faint outline with one point of light circling it.
    trace: function (box) {
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'trace');
      svg.setAttribute('aria-hidden', 'true');
      var rects = ['rail', 'tail', 'dot'].map(function (cls) {
        var r = document.createElementNS(svgNS, 'rect');
        r.setAttribute('class', cls);
        if (cls !== 'rail') r.setAttribute('pathLength', '100');
        svg.appendChild(r);
        return r;
      });
      // Each device starts its lap somewhere else, so two never move in step.
      rects[1].style.animationDelay = rects[2].style.animationDelay = (-Math.random() * 9).toFixed(2) + 's';
      box.appendChild(svg);
      var fig = box.querySelector('figure');
      var draw = function () {
        var w = box.clientWidth, h = box.clientHeight;
        var radius = parseFloat(getComputedStyle(fig).borderTopLeftRadius) || 0;
        var inset = fig.offsetLeft;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        rects.forEach(function (r) {
          r.setAttribute('x', 1); r.setAttribute('y', 1);
          r.setAttribute('width', Math.max(0, w - 2)); r.setAttribute('height', Math.max(0, h - 2));
          r.setAttribute('rx', radius + inset - 1);
        });
      };
      draw();
      if ('ResizeObserver' in window) new ResizeObserver(draw).observe(box);
    }
  };

  spots.forEach(function (s) {
    var box = document.createElement('div');
    box.className = 'frame';
    box.setAttribute('data-frame', frame);
    box.setAttribute('data-spot', s.spot);
    s.el.parentNode.insertBefore(box, s.el);
    box.appendChild(s.el);
    dress[frame](box, s);
  });
})();
