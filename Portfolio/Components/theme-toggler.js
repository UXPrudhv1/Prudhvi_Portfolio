(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (!toggle || !themeColor) return;

  const updateThemeControl = () => {
    const isDark = root.dataset.theme === 'dark';
    toggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    themeColor.content = isDark ? '#171815' : '#f5f2eb';
  };

  const applyTheme = theme => {
    root.dataset.theme = theme;
    updateThemeControl();
    try {
      localStorage.setItem('portfolio-theme', theme);
    } catch (error) {
      console.warn('Theme preference could not be saved.', error);
    }
  };

  updateThemeControl();

  toggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = document.startViewTransition;

    if (reducedMotion || typeof startViewTransition !== 'function') {
      applyTheme(nextTheme);
      return;
    }

    const bounds = toggle.getBoundingClientRect();
    root.style.setProperty('--theme-x', `${bounds.left + bounds.width / 2}px`);
    root.style.setProperty('--theme-y', `${bounds.top + bounds.height / 2}px`);

    const transition = startViewTransition.call(document, () => applyTheme(nextTheme));
    transition.finished.then(
      () => {
        root.style.removeProperty('--theme-x');
        root.style.removeProperty('--theme-y');
      },
      () => {
        root.style.removeProperty('--theme-x');
        root.style.removeProperty('--theme-y');
      }
    );
  });
})();
