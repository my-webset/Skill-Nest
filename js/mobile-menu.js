/* ═══════════════════════════════════════════════════════════════
   MOBILE MENU & RESPONSIVE UTILITIES
   Mobile navigation controller and responsive helper functions
═══════════════════════════════════════════════════════════════ */

class MobileMenu {
  constructor() {
    this.hamburger = document.querySelector('.hamburger-menu');
    this.mobileMenu = document.querySelector('.mobile-menu');
    this.overlay = document.querySelector('.mobile-menu-overlay');
    this.closeBtn = document.querySelector('.mobile-menu-close');
    
    this.init();
  }

  init() {
    if (!this.hamburger || !this.mobileMenu) return;

    // Event listeners
    this.hamburger.addEventListener('click', () => this.toggle());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());

    // Close menu on link click
    this.mobileMenu.querySelectorAll('.mobile-menu-link').forEach(link => {
      link.addEventListener('click', () => this.close());
    });

    // Keyboard: Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.mobileMenu.classList.contains('active')) {
        this.close();
      }
    });

    // Prevent body scroll when menu is open
    this.observeMenuState();
  }

  toggle() {
    if (this.mobileMenu.classList.contains('active')) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.mobileMenu.classList.add('active');
    this.overlay?.classList.add('active');
    this.hamburger?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.mobileMenu.classList.remove('active');
    this.overlay?.classList.remove('active');
    this.hamburger?.classList.remove('active');
    document.body.style.overflow = '';
  }

  observeMenuState() {
    const observer = new MutationObserver(() => {
      const isActive = this.mobileMenu.classList.contains('active');
      document.body.style.overflow = isActive ? 'hidden' : '';
    });

    observer.observe(this.mobileMenu, { attributes: true });
  }
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE UTILITIES
═══════════════════════════════════════════════════════════════ */

class ResponsiveHelper {
  // Breakpoints
  static BREAKPOINTS = {
    xs: 0,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
  };

  // Current breakpoint
  static getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width < this.BREAKPOINTS.sm) return 'xs';
    if (width < this.BREAKPOINTS.md) return 'sm';
    if (width < this.BREAKPOINTS.lg) return 'md';
    if (width < this.BREAKPOINTS.xl) return 'lg';
    return 'xl';
  }

  // Check if mobile
  static isMobile() {
    return window.innerWidth < this.BREAKPOINTS.md;
  }

  // Check if tablet
  static isTablet() {
    return window.innerWidth >= this.BREAKPOINTS.md && 
           window.innerWidth < this.BREAKPOINTS.lg;
  }

  // Check if desktop
  static isDesktop() {
    return window.innerWidth >= this.BREAKPOINTS.lg;
  }

  // Check if touch device
  static isTouchDevice() {
    return (
      (typeof window !== 'undefined' &&
        ('ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0)) ||
      false
    );
  }

  // Listen to breakpoint changes
  static onBreakpointChange(callback) {
    let currentBreakpoint = this.getCurrentBreakpoint();

    window.addEventListener('resize', () => {
      const newBreakpoint = this.getCurrentBreakpoint();
      if (newBreakpoint !== currentBreakpoint) {
        currentBreakpoint = newBreakpoint;
        callback(currentBreakpoint);
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR SCROLL EFFECT
═══════════════════════════════════════════════════════════════ */

class NavbarScroll {
  constructor() {
    this.navbar = document.querySelector('.navbar');
    this.scrollThreshold = 10;
    this.lastScrollY = 0;
    
    if (!this.navbar) return;
    
    this.init();
  }

  init() {
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
  }

  handleScroll() {
    const scrollY = window.scrollY;

    if (scrollY > this.scrollThreshold) {
      this.navbar.classList.add('scrolled');
    } else {
      this.navbar.classList.remove('scrolled');
    }

    this.lastScrollY = scrollY;
  }
}

/* ═══════════════════════════════════════════════════════════════
   TOPBAR SCROLL EFFECT
═══════════════════════════════════════════════════════════════ */

class TopbarScroll {
  constructor() {
    this.topbar = document.querySelector('.topbar');
    this.scrollThreshold = 10;
    
    if (!this.topbar) return;
    
    this.init();
  }

  init() {
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
  }

  handleScroll() {
    const scrollY = window.scrollY;

    if (scrollY > this.scrollThreshold) {
      this.topbar.classList.add('scrolled');
    } else {
      this.topbar.classList.remove('scrolled');
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVE LINK HIGHLIGHTING
═══════════════════════════════════════════════════════════════ */

class ActiveLink {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.init();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
  }

  init() {
    // Highlight nav links
    document.querySelectorAll('.nav-link, .nav-links a, .mobile-menu-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(this.currentPage)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   LAZY IMAGE LOADING
═══════════════════════════════════════════════════════════════ */

class LazyImageLoader {
  constructor() {
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback for older browsers
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
      });
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   SMOOTH SCROLL
═══════════════════════════════════════════════════════════════ */

class SmoothScroll {
  constructor() {
    this.init();
  }

  init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      });
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   iOS VIEWPORT FIX
   Prevents address bar resize issues on mobile
═══════════════════════════════════════════════════════════════ */

class IOSViewportFix {
  constructor() {
    this.init();
  }

  init() {
    // Add viewport meta tag if not present
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
      document.head.appendChild(viewport);
    }

    // Prevent zoom on input focus
    this.preventInputZoom();

    // Fix 100vh on mobile
    this.fixMobileHeight();
  }

  preventInputZoom() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      // Check if device is touch-enabled
      if (ResponsiveHelper.isTouchDevice()) {
        input.style.fontSize = '16px';
      }
    });
  }

  fixMobileHeight() {
    const setHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);
  }
}

/* ═══════════════════════════════════════════════════════════════
   FORM INPUT HELPERS
═══════════════════════════════════════════════════════════════ */

class FormHelper {
  static init() {
    // Prevent enter key from submitting form on textarea
    document.querySelectorAll('textarea').forEach(textarea => {
      textarea.addEventListener('keypress', (e) => {
        // Allow Ctrl+Enter / Cmd+Enter to submit
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
          // Allow default behavior (new line)
        }
      });
    });

    // Add visual feedback on form input
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
      input.addEventListener('focus', () => {
        input.parentElement?.classList.add('focused');
      });

      input.addEventListener('blur', () => {
        input.parentElement?.classList.remove('focused');
      });
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   INITIALIZE ALL
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all utilities
  new MobileMenu();
  new NavbarScroll();
  new TopbarScroll();
  new ActiveLink();
  new LazyImageLoader();
  new SmoothScroll();
  new IOSViewportFix();
  FormHelper.init();

  // Log current environment
  console.log('📱 Responsive Utils Initialized', {
    breakpoint: ResponsiveHelper.getCurrentBreakpoint(),
    isMobile: ResponsiveHelper.isMobile(),
    isTablet: ResponsiveHelper.isTablet(),
    isDesktop: ResponsiveHelper.isDesktop(),
    isTouchDevice: ResponsiveHelper.isTouchDevice(),
  });
});

/* ═══════════════════════════════════════════════════════════════
   EXPORTED FOR EXTERNAL USE
═══════════════════════════════════════════════════════════════ */

window.MobileMenu = MobileMenu;
window.ResponsiveHelper = ResponsiveHelper;
window.NavbarScroll = NavbarScroll;
window.TopbarScroll = TopbarScroll;
window.ActiveLink = ActiveLink;
window.LazyImageLoader = LazyImageLoader;
window.SmoothScroll = SmoothScroll;
window.IOSViewportFix = IOSViewportFix;
window.FormHelper = FormHelper;
