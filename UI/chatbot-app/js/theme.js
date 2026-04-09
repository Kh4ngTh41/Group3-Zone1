// ============================================================
// theme.js – Dark/Light mode manager
// ============================================================
(function() {
  const STORAGE_KEY = 'vincare_theme';

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    window.currentTheme = theme;
  }

  // Apply immediately (before paint) to avoid flash
  applyTheme(getPreferred());

  window.toggleTheme = function() {
    const next = window.currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  window.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', window.toggleTheme);
  });
})();
