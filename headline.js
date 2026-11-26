// Runs right after the hero headline is parsed, before it is drawn: swaps in one of twenty headlines. Each visitor
// walks a shuffled deck, so they see a different one on every visit and all twenty before any repeats. Without
// JavaScript (and for search engines) the headline in the HTML stays.
(function () {
  var lines = [
    'Your Mac does the thinking.',
    'Your Mac is the mainframe now.',
    'Smart Mac. Dumb terminal.',
    'The 1970s had the right idea.',
    'Dumb on purpose.',
    'Last login: just now, from the couch.',
    'There’s no place like ~',
    'Mac: up. You: anywhere.',
    'Connected. Desk optional.',
    'sudo make this a Mac',
    'All the Mac. None of the desk.',
    'Leave your Mac. Take your Mac.',
    'Your Mac stays home. You don’t have to.',
    '⌘ + Couch',
    'A Mac in every room.',
    'Your Mac already knows how.',
    'Your Mac came with this.',
    'The Mac half is already done.',
    'Installed on your Mac: nothing.',
    'Zero installs. One tap.'
  ];
  var shuffled = function () {
    var deck = lines.map(function (_, i) { return i; });
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    return deck;
  };
  var pick;
  try {
    var saved = JSON.parse(localStorage.getItem('dt-headlines') || 'null');
    var ok = saved && Array.isArray(saved.deck) && saved.deck.length === lines.length && typeof saved.next === 'number';
    var deck = ok ? saved.deck : shuffled();
    var next = ok ? saved.next : 0;
    if (next >= deck.length) {
      // A new deck, but never the one just seen twice in a row.
      var last = deck[deck.length - 1];
      deck = shuffled();
      if (deck[0] === last) deck.push(deck.shift());
      next = 0;
    }
    pick = deck[next];
    localStorage.setItem('dt-headlines', JSON.stringify({ deck: deck, next: next + 1 }));
  } catch (e) {
    pick = Math.floor(Math.random() * lines.length); // storage blocked: just a random one
  }
  var text = lines[pick];
  if (typeof text !== 'string') text = lines[0];
  // Keep the last word with the one before it, so a line never ends on a single short word.
  var cut = text.lastIndexOf(' ');
  if (cut > 0) text = text.slice(0, cut) + ' ' + text.slice(cut + 1);
  var h1 = document.querySelector('.hero h1');
  // toy.js and shell.js read the headline from the h1's first text node, so only that node changes.
  if (h1 && h1.firstChild && h1.firstChild.nodeType === 3) h1.firstChild.nodeValue = text;
  document.documentElement.classList.add('headline');
})();
