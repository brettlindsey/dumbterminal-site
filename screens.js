// Dumb Terminal's site, part 6: the app's screenshots, kept cryptic. The home screen arrives scrambled and decrypts
// when you point at it (or after a moment in view); the Away screen downloads over a pretend modem; and a little TV
// shows four channels of the app, with a fifth that is only static. Without JavaScript, or with Reduce Motion on,
// every screenshot is simply shown.
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT) return;
  var still = DT.still();
  var fine = window.matchMedia('(pointer: fine)').matches;

  // ---- S1 · Decrypt: scrambled characters cover the screenshot until a scan line wipes them away. ----
  var fig = document.querySelector('[data-decrypt]');
  var status = document.querySelector('[data-decrypt-status]');
  if (fig && !still) {
    var cover = document.createElement('pre');
    cover.className = 'scramble';
    cover.setAttribute('aria-hidden', 'true');
    var scan = document.createElement('div');
    scan.className = 'scan';
    scan.setAttribute('aria-hidden', 'true');
    fig.appendChild(cover);
    fig.appendChild(scan);
    var glyphs = '01<>/{}[]=+*%#ABCDEF$~';
    var shown = 0;          // 0: all scrambled, 1: all decrypted
    var running = null;
    var waiting = null;
    var noise = null;
    var bar = function (p) {
      var n = Math.round(p * 10);
      return '[' + new Array(n + 1).join('#') + new Array(11 - n).join('·') + ']';
    };
    var paint = function () {
      cover.style.clipPath = 'inset(' + (shown * 100) + '% 0 0 0)';
      scan.style.top = (shown * 100) + '%';
      scan.style.opacity = shown > 0 && shown < 1 ? '1' : '0';
      if (!status) return;
      if (shown >= 1) status.textContent = 'home.png · decrypted';
      else if (shown > 0) status.textContent = 'decrypting home.png ' + bar(shown) + ' ' + Math.round(shown * 100) + '%';
      else status.textContent = 'home.png · encrypted. ' + (fine ? 'point at it to decrypt.' : 'tap to decrypt.');
    };
    var scramble = function () {
      var cols = Math.ceil(fig.clientWidth / 6.6) + 1;
      var rows = Math.ceil(fig.clientHeight / 13) + 1;
      var out = '';
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) out += glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        out += '\n';
      }
      cover.textContent = out;
    };
    var startNoise = function () { if (!noise) { scramble(); noise = setInterval(scramble, 140); } };
    var stopNoise = function () { clearInterval(noise); noise = null; };
    var decrypt = function () {
      clearTimeout(waiting);
      if (running || shown >= 1) return;
      var from = shown;
      var t0 = performance.now();
      var step = function (now) {
        shown = Math.min(1, from + (now - t0) / 1100);
        paint();
        if (shown < 1) running = requestAnimationFrame(step);
        else { running = null; stopNoise(); }
      };
      running = requestAnimationFrame(step);
    };
    var rescramble = function () {
      clearTimeout(waiting);
      if (running) { cancelAnimationFrame(running); running = null; }
      shown = 0;
      paint();
    };
    fig.addEventListener('pointerenter', decrypt);
    fig.addEventListener('click', decrypt);
    // In view for a moment decrypts it anyway (phones, keyboards); scrolled away, it scrambles again.
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          startNoise();
          waiting = setTimeout(decrypt, fine ? 2600 : 1400);
        } else {
          stopNoise();
          rescramble();
        }
      });
    }, { threshold: 0.6 }).observe(fig);
    paint();
  }

  // ---- S4 · Over a modem: the Away screen paints in band by band, with a byte counter. Once per visit. ----
  var modem = document.querySelector('[data-modem]');
  var modemLine = document.querySelector('[data-modem-line]');
  if (modem && !still) {
    var veil = document.createElement('div');
    veil.className = 'modem-cover';
    veil.setAttribute('aria-hidden', 'true');
    var progress = document.createElement('div');
    progress.className = 'modem-bar';
    progress.setAttribute('aria-hidden', 'true');
    modem.appendChild(veil);
    modem.appendChild(progress);
    var got = 0;
    var show = function () {
      veil.style.top = got + '%';
      progress.style.top = 'calc(' + got + '% - 4px)';
      progress.style.width = got + '%';
      progress.style.opacity = got >= 100 ? '0' : '1';
      if (modemLine) {
        modemLine.textContent = got >= 100 ? 'away.png · 82K received' :
          'CONNECT 14400 · receiving away.png ' + got + '% (' + (82 * got / 100).toFixed(1) + 'K of 82K)';
      }
    };
    show();
    var started = false;
    new IntersectionObserver(function (entries, observer) {
      if (started || !entries[0].isIntersecting) return;
      started = true;
      observer.disconnect();
      var tick = function () {
        got = Math.min(100, got + 2 + Math.floor(Math.random() * 5));
        show();
        if (got < 100) setTimeout(tick, 60 + Math.random() * 90);
      };
      setTimeout(tick, 300);
    }, { threshold: 0.4 }).observe(modem);
  }

  // ---- S8 · The TV: four channels of the app, and channel 00, which is static. Wait on 00 and something shows. ----
  var tv = document.querySelector('[data-tv]');
  if (!tv) return;
  var img = tv.querySelector('[data-tv-img]');
  var label = tv.querySelector('[data-tv-ch]');
  var knob = tv.querySelector('[data-tv-next]');
  var list = document.querySelector('.channels');
  var say = document.querySelector('[data-tv-say]');
  var canvas = tv.querySelector('.tv-static');
  var g = canvas.getContext('2d');
  var channels = {
    3: ['home', 'Channel 3, home: your Macs, nearby and away, listed by name.'],
    4: ['session', 'Channel 4, session: a Mac’s desktop at the top of the screen, with a trackpad below it.'],
    5: ['layouts', 'Channel 5, layouts: One Big Mac, one Mac at a time, with the next ones peeking in at the edges.'],
    6: ['away', 'Channel 6, away: the checklist for reaching your Macs from anywhere.']
  };
  var order = [3, 4, 5, 6, 0];
  var current = 3;
  var turns = 0;
  var foundTimer = null;
  var noiseTimer = null;
  knob.hidden = false;
  list.hidden = false;

  var drawNoise = function () {
    var data = g.createImageData(canvas.width, canvas.height);
    for (var i = 0; i < data.data.length; i += 4) {
      var v = Math.random() * 255;
      data.data[i] = v * 0.55;
      data.data[i + 1] = v;
      data.data[i + 2] = v * 0.6;
      data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  };
  var noiseOn = function () { drawNoise(); if (!still && !noiseTimer) noiseTimer = setInterval(drawNoise, 70); };
  var noiseOff = function () { clearInterval(noiseTimer); noiseTimer = null; };

  var tune = function (ch, quiet) {
    if (ch === current) return;
    current = ch;
    turns += 1;
    knob.style.setProperty('--turn', (turns * 51) + 'deg');
    clearTimeout(foundTimer);
    tv.classList.remove('found', 'roll');
    list.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-ch') === ch)); });
    label.textContent = 'CH ' + DT.pad(ch);
    var apply = function () {
      if (ch === 0) {
        tv.classList.add('ch0');
        noiseOn();
        if (say && !quiet) say.textContent = 'Channel 0: static.';
        // Stay a while and the static gives up a test card with a hint.
        foundTimer = setTimeout(function () {
          noiseOff();
          tv.classList.add('found');
          if (say) say.textContent = 'Channel 0: signal found. It says: prism.';
        }, 6000);
        return;
      }
      tv.classList.remove('ch0');
      noiseOff();
      img.src = '/img/screens/' + channels[ch][0] + '.jpg';
      img.alt = channels[ch][1];
      if (say && !quiet) say.textContent = channels[ch][1];
      if (!still) { void tv.offsetWidth; tv.classList.add('roll'); }
    };
    if (still) { apply(); return; }
    // A short burst of static between channels.
    tv.classList.add('tuning');
    noiseOn();
    setTimeout(function () { tv.classList.remove('tuning'); if (ch !== 0) noiseOff(); apply(); }, 260);
  };
  var next = function (dir) {
    var i = order.indexOf(current);
    tune(order[(i + dir + order.length) % order.length]);
  };
  knob.addEventListener('click', function () { next(1); });
  tv.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); next(-1); }
  });
  list.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-ch]');
    if (b) tune(+b.getAttribute('data-ch'));
  });
  // Preload the other channels once the TV is close, so switching is instant.
  new IntersectionObserver(function (entries, observer) {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    Object.keys(channels).forEach(function (k) { new Image().src = '/img/screens/' + channels[k][0] + '.jpg'; });
  }, { rootMargin: '400px' }).observe(tv);

  // From the command line: `tune`, `tune 5`, `open away.png`, `ls screens`.
  if (DT.shell) {
    var byName = {};
    Object.keys(channels).forEach(function (k) { byName[channels[k][0]] = +k; });
    var go = function (ch) {
      tune(ch, true);
      var target = document.getElementById('tune');
      if (target) target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    };
    DT.shell.register(['tune'], function (cmd) {
      var arg = cmd.split(' ')[1];
      if (!arg) {
        Object.keys(channels).forEach(function (k) { DT.shell.say('CH ' + DT.pad(+k) + '  ' + channels[k][0]); });
        DT.shell.say('tune <channel>', 'dim');
        return;
      }
      var ch = byName[arg] !== undefined ? byName[arg] : parseInt(arg, 10);
      if (ch === 0 || channels[ch]) { DT.shell.say(ch === 0 ? 'tuning to 00. nothing but static.' : 'tuning to ' + DT.pad(ch) + '.'); go(ch); }
      else DT.shell.say('tune: no signal on ' + arg);
    });
    DT.shell.register(['open'], function (cmd) {
      var name = (cmd.split(' ')[1] || '').replace(/^.*\//, '').replace(/\.png$/, '');
      if (byName[name] !== undefined) { DT.shell.say('opening ' + name + '.png on channel ' + DT.pad(byName[name]) + '.'); go(byName[name]); }
      else DT.shell.say('open: ' + (name || 'what?') + (name ? ': no such file' : ''));
    });
  }
})();
