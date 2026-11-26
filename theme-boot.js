// Runs before the page draws: puts back the theme this visitor chose, so there is no flash of the wrong one.
(function () {
  try {
    var theme = localStorage.getItem('dt-theme');
    if (theme && /^(red|yellow|blue|rainbow)$/.test(theme)) document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { /* storage blocked: green it is */ }
  document.documentElement.classList.add('js');
})();
