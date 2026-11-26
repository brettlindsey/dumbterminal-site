// Dumb Terminal's site, part 6: the app's screenshots. The home screen comes on calmly when you reach it (one of
// three ways per visit); the Away screen downloads over a pretend modem; and a little TV shows four channels of the
// app, with a fifth that is only static. Without JavaScript, or with Reduce Motion on, every screenshot is simply
// shown. The frames around them are frames.js.
(function () {
  'use strict';
  var DT = window.DT;
  if (!DT) return;
  var still = DT.still();

  // ---- S1 · Arrival: the home screen comes on once, calmly, when it scrolls into view. Each visit picks one of
  // three: Warm up (a line of light opens into the screen, like a tube), Focus (soft and dim under "connecting",
  // then sharp), or Log in (three lines type out, then the screen fades in). ----
  var fig = document.querySelector('[data-intro]');
  var status = document.querySelector('[data-intro-status]');
  if (fig && !still) {
    var intros = ['warm', 'focus', 'login'];
    var askedIntro = new URLSearchParams(location.search).get('intro');   // `?intro=focus`, as for frames
    var lastIntro = DT.session('dt-intro');
    var choices = intros.filter(function (n) { return n !== lastIntro; });
    var intro = intros.indexOf(askedIntro) >= 0 ? askedIntro : choices[Math.floor(Math.random() * choices.length)];
    DT.session('dt-intro', intro);
    var shot = fig.querySelector('img');
    var words = document.createElement('pre');
    words.className = 'intro-text';
    words.setAttribute('aria-hidden', 'true');
    fig.appendChild(words);
    fig.classList.add('intro-' + intro, 'waiting');
    var tell = function (text, done) {
      if (!status) return;
      status.textContent = text;
      if (done) {
        var b = document.createElement('b');
        b.textContent = done;
        status.appendChild(b);
      }
    };
    tell('home.png · waiting');
    if (intro === 'focus') words.textContent = 'connecting to\nStudio Mac…';
    var played = false;
    var play = function () {
      if (played) return;
      played = true;
      fig.classList.remove('waiting');
      if (intro === 'warm') {
        tell('warming up home.png…');
        fig.classList.add('playing');
        setTimeout(function () { tell('home.png · ', 'ready'); }, 1000);
      } else if (intro === 'focus') {
        tell('connecting to Studio Mac…');
        fig.classList.add('playing');
        setTimeout(function () { tell('home.png · ', 'connected'); }, 1600);
      } else {
        tell('logging in…');
        var text = DT.prompt() + ' ssh studio-mac\npassword: ••••••\nconnected.';
        var shown = 0;
        var typing = setInterval(function () {
          shown += 1;
          words.textContent = text.slice(0, shown) + '▌';
          if (shown < text.length) return;
          clearInterval(typing);
          setTimeout(function () { fig.classList.add('playing'); tell('home.png · ', 'ready'); }, 450);
        }, 45);
      }
    };
    // A third in view is enough, so short screens (a phone on its side) still get there; pointing or tapping
    // plays it too.
    new IntersectionObserver(function (entries, observer) {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      play();
    }, { threshold: 0.3 }).observe(fig);
    fig.addEventListener('pointerenter', play);
    fig.addEventListener('click', play);
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
