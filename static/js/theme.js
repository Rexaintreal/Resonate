class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme();
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.createToggleButton();
    this.watchSystemTheme();
  }

  getStoredTheme() {
    const stored = localStorage.getItem('resonate-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('resonate-theme', theme);
    this.updateToggleIcon();
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    document.body.style.setProperty('--theme-transition', 'all 0.3s ease');
    setTimeout(() => {
      document.body.style.removeProperty('--theme-transition');
    }, 300);
  }

  createToggleButton() {
    // Check if we're on index or auth page
    const isAuthPage = window.location.pathname === '/' || 
                       window.location.pathname === '/auth';
    
    if (isAuthPage) return; 

    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Toggle theme');
    toggle.innerHTML = '<i class="fas fa-moon"></i>';
    
    toggle.addEventListener('click', () => this.toggleTheme());
    
    document.body.appendChild(toggle);
    this.toggleButton = toggle;
    this.updateToggleIcon();
  }

  updateToggleIcon() {
    if (!this.toggleButton) return;
    
    const icon = this.toggleButton.querySelector('i');
    if (this.currentTheme === 'dark') {
      icon.className = 'fas fa-sun';
    } else {
      icon.className = 'fas fa-moon';
    }
  }

  watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('resonate-theme')) {
        this.applyTheme(e.matches ? 'light' : 'dark');
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
  });
} else {
  window.themeManager = new ThemeManager();
}

export default ThemeManager;