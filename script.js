/**
 * ═══════════════════════════════════════════════════════════════
 *  SkillNest — script.js
 *  Shared JavaScript Library
 *
 *  TABLE OF CONTENTS
 *  ─────────────────────────────────────────
 *  01. Config & Constants
 *  02. DOM Utilities
 *  03. API Layer (fetch wrapper)
 *  04. Auth Module
 *  05. Navbar & Sidebar
 *  06. Toast Notifications
 *  07. Modal Manager
 *  08. Course Utilities
 *  09. Search & Filter
 *  10. Bookmark / Save
 *  11. Progress Tracker
 *  12. Form Validation
 *  13. Scroll & Animation
 *  14. Storage Helpers (localStorage)
 *  15. Date & Time Utilities
 *  16. String Utilities
 *  17. Debounce & Throttle
 *  18. Event Bus
 *  19. Page Init Router
 *  20. DOMContentLoaded Bootstrap
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ═══════════════════════════════════════
   01. CONFIG & CONSTANTS
═══════════════════════════════════════ */
const SN = {
  version:  '1.0.0',
  name:     'SkillNest',
  api: {
    base:    '/api',          // Flask backend base URL
    timeout: 10000,           // ms
  },
  routes: {
    home:       'index.html',
    explore:    'explore.html',
    course:     'course.html',
    login:      'login.html',
    register:   'register.html',
    dashboard:  'dashboard.html',
    addCourse:  'add-course.html',
  },
  storage: {
    token:      'sn_token',
    user:       'sn_user',
    bookmarks:  'sn_bookmarks',
    theme:      'sn_theme',
    searches:   'sn_searches',
  },
  currency:   '₹',
  ratingMax:  5,
};

/* Categories list (used in filters & forms) */
const CATEGORIES = [
  { id: 'web',      label: 'Web Development',     icon: '💻', count: 142 },
  { id: 'ai',       label: 'AI & Machine Learning',icon: '🤖', count: 89  },
  { id: 'design',   label: 'UI/UX Design',         icon: '🎨', count: 76  },
  { id: 'data',     label: 'Data Science',          icon: '📊', count: 98  },
  { id: 'mobile',   label: 'Mobile Development',   icon: '📱', count: 63  },
  { id: 'cloud',    label: 'Cloud & DevOps',        icon: '☁️', count: 57  },
  { id: 'security', label: 'Cybersecurity',         icon: '🔐', count: 41  },
  { id: 'business', label: 'Digital Marketing',     icon: '📈', count: 54  },
  { id: 'video',    label: 'Video & Media',         icon: '🎬', count: 38  },
];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const LANGUAGES = ['English', 'Hindi', 'Gujarati', 'Tamil', 'Telugu', 'Marathi'];


/* ═══════════════════════════════════════
   02. DOM UTILITIES
═══════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {
  /** Create element with attrs & children */
  create(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class')     el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    children.flat().forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child instanceof Node) el.appendChild(child);
    });
    return el;
  },

  /** Show / hide element */
  show(el)   { if (el) el.style.display = ''; },
  hide(el)   { if (el) el.style.display = 'none'; },
  toggle(el, force) {
    if (!el) return;
    const show = force !== undefined ? force : el.style.display === 'none';
    el.style.display = show ? '' : 'none';
  },

  /** Add / remove / toggle class */
  addClass(el, ...cls)    { el && el.classList.add(...cls); },
  removeClass(el, ...cls) { el && el.classList.remove(...cls); },
  toggleClass(el, cls, force) { el && el.classList.toggle(cls, force); },
  hasClass(el, cls)       { return el ? el.classList.contains(cls) : false; },

  /** Animate element in */
  fadeIn(el, duration = 200) {
    if (!el) return;
    el.style.opacity = '0';
    el.style.display = '';
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  },

  /** Scroll to element */
  scrollTo(el, offset = 80) {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  },

  /** Get value from input safely */
  val(sel, ctx = document) {
    const el = $(sel, ctx);
    return el ? el.value.trim() : '';
  },
};


/* ═══════════════════════════════════════
   03. API LAYER
═══════════════════════════════════════ */
const api = {
  /** Base fetch with auth header & timeout */
  async request(method, path, body = null, options = {}) {
    const token = storage.get(SN.storage.token);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SN.api.timeout);

    try {
      const res = await fetch(SN.api.base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timer);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new ApiError(data.message || `HTTP ${res.status}`, res.status, data);
      }
      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new ApiError('Request timed out', 408);
      throw err;
    }
  },

  get:    (path, opts)       => api.request('GET',    path, null, opts),
  post:   (path, body, opts) => api.request('POST',   path, body, opts),
  put:    (path, body, opts) => api.request('PUT',    path, body, opts),
  patch:  (path, body, opts) => api.request('PATCH',  path, body, opts),
  delete: (path, opts)       => api.request('DELETE', path, null, opts),

  /* ── Course endpoints ── */
  courses: {
    list:   (params = {}) => api.get('/courses?' + new URLSearchParams(params)),
    get:    (id)          => api.get(`/courses/${id}`),
    create: (data)        => api.post('/courses', data),
    update: (id, data)    => api.put(`/courses/${id}`, data),
    delete: (id)          => api.delete(`/courses/${id}`),
    search: (q, filters)  => api.get('/courses/search?' + new URLSearchParams({ q, ...filters })),
  },

  /* ── Auth endpoints ── */
  auth: {
    login:    (email, password) => api.post('/auth/login',    { email, password }),
    register: (data)            => api.post('/auth/register', data),
    logout:   ()                => api.post('/auth/logout'),
    me:       ()                => api.get('/auth/me'),
    refresh:  ()                => api.post('/auth/refresh'),
  },

  /* ── Bookmark endpoints ── */
  bookmarks: {
    list:   ()   => api.get('/bookmarks'),
    add:    (id) => api.post('/bookmarks', { course_id: id }),
    remove: (id) => api.delete(`/bookmarks/${id}`),
  },

  /* ── Review endpoints ── */
  reviews: {
    list:   (courseId)   => api.get(`/courses/${courseId}/reviews`),
    create: (courseId, data) => api.post(`/courses/${courseId}/reviews`, data),
    delete: (id)         => api.delete(`/reviews/${id}`),
  },

  /* ── User endpoints ── */
  users: {
    profile:       ()     => api.get('/users/me'),
    update:        (data) => api.put('/users/me', data),
    enrollments:   ()     => api.get('/users/me/enrollments'),
    certificates:  ()     => api.get('/users/me/certificates'),
    progress:      (courseId) => api.get(`/users/me/progress/${courseId}`),
    updateProgress:(courseId, lessonId) => api.post(`/users/me/progress/${courseId}`, { lesson_id: lessonId }),
  },
};

/** Custom API error */
class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name    = 'ApiError';
    this.status  = status;
    this.data    = data;
  }
}


/* ═══════════════════════════════════════
   04. AUTH MODULE
═══════════════════════════════════════ */
const auth = {
  /** Get current user from storage */
  user() {
    return storage.getJSON(SN.storage.user);
  },

  /** Check if user is logged in */
  isLoggedIn() {
    return !!storage.get(SN.storage.token);
  },

  /** Login — call API, store token & user */
  async login(email, password) {
    const data = await api.auth.login(email, password);
    storage.set(SN.storage.token, data.token);
    storage.setJSON(SN.storage.user, data.user);
    events.emit('auth:login', data.user);
    return data;
  },

  /** Register */
  async register(payload) {
    const data = await api.auth.register(payload);
    storage.set(SN.storage.token, data.token);
    storage.setJSON(SN.storage.user, data.user);
    events.emit('auth:register', data.user);
    return data;
  },

  /** Logout */
  async logout() {
    try { await api.auth.logout(); } catch (_) {}
    storage.remove(SN.storage.token);
    storage.remove(SN.storage.user);
    events.emit('auth:logout');
    window.location.href = SN.routes.home;
  },

  /** Require login — redirect if not authenticated */
  requireLogin() {
    if (!this.isLoggedIn()) {
      sessionStorage.setItem('sn_redirect', window.location.href);
      window.location.href = SN.routes.login;
      return false;
    }
    return true;
  },

  /** Redirect to previous page or dashboard after login */
  redirectAfterLogin() {
    const redirect = sessionStorage.getItem('sn_redirect');
    sessionStorage.removeItem('sn_redirect');
    window.location.href = redirect || SN.routes.dashboard;
  },
};


/* ═══════════════════════════════════════
   05. NAVBAR & SIDEBAR
═══════════════════════════════════════ */
const navbar = {
  init() {
    this.highlightActive();
    this.initScrollEffect();
    this.initMobileToggle();
    this.renderUserState();
  },

  /** Highlight current page link in nav */
  highlightActive() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    $$('.nav-link, .nav-links a').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href === current || href === './' + current) {
        link.classList.add('active');
      }
    });
  },

  /** Scrolled class on navbar */
  initScrollEffect() {
    const nav = $('.navbar') || $('.topbar');
    if (!nav) return;
    const onScroll = throttle(() => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, 100);
    window.addEventListener('scroll', onScroll, { passive: true });
  },

  /** Mobile sidebar toggle */
  initMobileToggle() {
    const toggleBtn = $('#sidebar-toggle');
    const sidebar   = $('.sidebar');
    const backdrop  = $('#sidebar-backdrop');
    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('open');
    });
    backdrop?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    });
  },

  /** Show user name/avatar or login button */
  renderUserState() {
    const user = auth.user();
    const userArea = $('#nav-user-area');
    if (!userArea) return;

    if (user) {
      userArea.innerHTML = `
        <div class="sidebar-user" onclick="window.location='${SN.routes.dashboard}'">
          <img src="images/reviewer-arjun.jpg" alt="${user.name || 'User'}"
               class="sidebar-avatar-img" width="34" height="34"
               onerror="this.style.display='none'" />
          <div>
            <div class="sidebar-user-name">${str.truncate(user.name || 'Student', 18)}</div>
            <div class="sidebar-user-plan"><span class="plan-dot"></span>${user.plan || 'Free'}</div>
          </div>
        </div>`;
    } else {
      userArea.innerHTML = `
        <a href="${SN.routes.login}"><button class="btn btn-ghost btn-sm">Log in</button></a>
        <a href="${SN.routes.register}"><button class="btn btn-primary btn-sm">Sign up</button></a>`;
    }
  },
};


/* ═══════════════════════════════════════
   06. TOAST NOTIFICATIONS
═══════════════════════════════════════ */
const toast = {
  container: null,

  _getContainer() {
    if (!this.container) {
      this.container = dom.create('div', { class: 'toast-container', id: 'toast-container' });
      document.body.appendChild(this.container);
    }
    return this.container;
  },

  show(message, type = 'default', duration = 3500) {
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const el = dom.create('div', {
      class: `toast ${type !== 'default' ? 'toast-' + type : ''}`,
      html:  `${icons[type] || ''}<span>${message}</span>`,
    });

    const container = this._getContainer();
    container.appendChild(el);

    // Auto remove
    const remove = () => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(110%)';
      el.style.transition = '0.3s ease';
      setTimeout(() => el.remove(), 300);
    };

    if (duration > 0) setTimeout(remove, duration);
    el.addEventListener('click', remove);
    return el;
  },

  success: (msg, dur) => toast.show(msg, 'success', dur),
  error:   (msg, dur) => toast.show(msg, 'error',   dur),
  warning: (msg, dur) => toast.show(msg, 'warning', dur),
  info:    (msg, dur) => toast.show(msg, 'info',    dur),
};


/* ═══════════════════════════════════════
   07. MODAL MANAGER
═══════════════════════════════════════ */
const modal = {
  active: null,

  open(id) {
    const backdrop = $(`#${id}`);
    if (!backdrop) return;
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.active = backdrop;

    // Close on backdrop click
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) this.close(id);
    });

    // Close on Escape
    const onKey = e => { if (e.key === 'Escape') { this.close(id); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  },

  close(id) {
    const backdrop = id ? $(`#${id}`) : this.active;
    if (!backdrop) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    this.active = null;
  },

  /** Create and show a modal programmatically */
  create({ title, body, footer, id = 'modal-' + Date.now(), size = '' }) {
    const existing = $(`#${id}`);
    if (existing) existing.remove();

    const el = dom.create('div', {
      class: 'modal-backdrop',
      id,
      html: `
        <div class="modal ${size ? 'modal-' + size : ''}">
          <div class="modal-header">
            <div class="modal-title">${title || ''}</div>
            <button class="modal-close" onclick="modal.close('${id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">${body || ''}</div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>`,
    });

    document.body.appendChild(el);
    requestAnimationFrame(() => this.open(id));
    return id;
  },

  confirm(message, onConfirm, onCancel) {
    const id = this.create({
      title: 'Confirm',
      body:  `<p style="font-size:15px;color:var(--ink-soft)">${message}</p>`,
      footer: `
        <button class="btn btn-secondary" onclick="modal.close('${id}')">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm-btn">Confirm</button>`,
    });
    setTimeout(() => {
      $('#modal-confirm-btn')?.addEventListener('click', () => {
        modal.close(id);
        onConfirm?.();
      });
    }, 50);
  },
};


/* ═══════════════════════════════════════
   08. COURSE UTILITIES
═══════════════════════════════════════ */
const courses = {
  /** Format price display */
  formatPrice(price, original = null) {
    if (!price || price === 0) return `<span class="price-free" style="color:var(--green)">Free</span>`;
    let html = `<span class="course-price">${SN.currency}${str.formatNumber(price)}</span>`;
    if (original && original > price) {
      html += ` <span class="price-original" style="text-decoration:line-through;color:var(--ink-muted);font-size:13px">${SN.currency}${str.formatNumber(original)}</span>`;
      const pct = Math.round((1 - price / original) * 100);
      html += ` <span class="badge badge-accent" style="font-size:11px">${pct}% off</span>`;
    }
    return html;
  },

  /** Render star rating */
  renderStars(rating, max = 5) {
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = max - full - half;
    const star  = (type) => `<span style="color:${type === 'empty' ? 'var(--border-strong)' : 'var(--gold)'};font-size:13px">★</span>`;
    return Array(full).fill(star('full')).join('') +
           Array(half).fill(star('half')).join('') +
           Array(empty).fill(star('empty')).join('');
  },

  /** Build a course card HTML string */
  buildCard(course) {
    return `
      <div class="course-card" onclick="window.location='${SN.routes.course}?id=${course.id}'">
        <div class="course-thumb" style="height:170px">
          <img src="${course.thumbnail || 'images/ai-course.jpg'}"
               alt="${str.escape(course.title)}"
               style="width:100%;height:100%;object-fit:cover"
               onerror="this.src='images/ai-course.jpg'" />
          ${course.badge ? `<span class="course-badge badge-${course.badge.toLowerCase()}" style="position:absolute;top:10px;left:10px">${course.badge}</span>` : ''}
          <button class="bookmark-btn ${bookmarks.has(course.id) ? 'saved' : ''}"
                  onclick="event.stopPropagation();bookmarks.toggle(${course.id},this)"
                  style="position:absolute;top:10px;right:10px;width:30px;height:30px;background:rgba(255,255,255,.9);border:none;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer">
            <svg viewBox="0 0 24 24" fill="${bookmarks.has(course.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;color:var(--brand)"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
        <div class="course-card-body">
          <div style="display:flex;gap:5px;margin-bottom:8px">
            ${(course.tags || []).slice(0, 2).map(t => `<span class="course-tag tag-${t.toLowerCase()}">${t}</span>`).join('')}
          </div>
          <div class="course-card-title">${str.escape(course.title)}</div>
          <div class="course-card-instructor" style="margin:5px 0">by ${str.escape(course.instructor || 'Instructor')}</div>
          <div class="course-card-meta">
            ${this.renderStars(course.rating || 0)}
            <span class="rating-num">${(course.rating || 0).toFixed(1)}</span>
            <span class="rating-dot">·</span>
            <span>${str.formatNumber(course.students || 0)} students</span>
          </div>
        </div>
        <div class="course-card-footer">
          ${this.formatPrice(course.price, course.original_price)}
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.location='${SN.routes.course}?id=${course.id}'">Enroll</button>
        </div>
      </div>`;
  },

  /** Render courses into a container */
  render(containerSel, courseList) {
    const container = $(containerSel);
    if (!container) return;
    if (!courseList || courseList.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ink-muted)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:44px;height:44px;margin:0 auto 14px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <div style="font-size:16px;font-weight:600;color:var(--ink-soft);margin-bottom:6px">No courses found</div>
          <div style="font-size:13px">Try adjusting your filters or search terms</div>
        </div>`;
      return;
    }
    container.innerHTML = courseList.map(c => this.buildCard(c)).join('');
  },

  /** Get URL param (course id etc.) */
  getParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  },
};


/* ═══════════════════════════════════════
   09. SEARCH & FILTER
═══════════════════════════════════════ */
const search = {
  state: {
    query:    '',
    category: 'all',
    level:    [],
    price:    'all',   // 'free' | 'paid' | 'all'
    rating:   0,
    sort:     'popular',
    page:     1,
  },

  init(onResults) {
    this._onResults = onResults;
    this._bindHeroSearch();
    this._bindCategoryChips();
    this._bindSortSelect();
  },

  _bindHeroSearch() {
    const input = $('#hero-search, .explore-hero-search input');
    const btn   = $('#hero-search-btn');
    if (!input) return;

    const doSearch = debounce(() => {
      this.state.query = input.value.trim();
      this.state.page  = 1;
      this._run();
    }, 400);

    input.addEventListener('input', doSearch);
    btn?.addEventListener('click', () => { this.state.query = input.value.trim(); this._run(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { this.state.query = input.value.trim(); this._run(); } });
  },

  _bindCategoryChips() {
    $$('.chip[data-cat]').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.state.category = chip.dataset.cat;
        this.state.page     = 1;
        this._run();
      });
    });
  },

  _bindSortSelect() {
    const sel = $('#sort-select');
    if (!sel) return;
    sel.addEventListener('change', () => {
      const map = {
        'Most Popular':        'popular',
        'Highest Rated':       'rating',
        'Newest':              'newest',
        'Price: Low to High':  'price_asc',
        'Price: High to Low':  'price_desc',
      };
      this.state.sort = map[sel.value] || 'popular';
      this._run();
    });
  },

  setFilter(key, value) {
    this.state[key] = value;
    this.state.page = 1;
    this._run();
  },

  async _run() {
    const count = $('#result-count');
    if (count) count.innerHTML = '<span style="opacity:.5">Searching…</span>';

    try {
      const data = await api.courses.search(this.state.query, {
        category: this.state.category !== 'all' ? this.state.category : undefined,
        level:    this.state.level.join(',') || undefined,
        price:    this.state.price !== 'all' ? this.state.price : undefined,
        rating:   this.state.rating || undefined,
        sort:     this.state.sort,
        page:     this.state.page,
      });
      if (count) count.innerHTML = `<strong>${str.formatNumber(data.total || 0)}</strong> courses found`;
      this._onResults?.(data.courses || [], data);
    } catch (err) {
      console.warn('Search error:', err);
      // In development without backend — show all from JSON
      this._onResults?.([], { total: 0 });
    }
  },

  /** Save recent search to localStorage */
  saveRecent(term) {
    if (!term) return;
    const arr = storage.getJSON(SN.storage.searches) || [];
    const filtered = arr.filter(s => s !== term).slice(0, 8);
    filtered.unshift(term);
    storage.setJSON(SN.storage.searches, filtered);
  },

  getRecent() {
    return storage.getJSON(SN.storage.searches) || [];
  },
};


/* ═══════════════════════════════════════
   10. BOOKMARK / SAVE
═══════════════════════════════════════ */
const bookmarks = {
  /** Get saved set from localStorage */
  _getSet() {
    return new Set(storage.getJSON(SN.storage.bookmarks) || []);
  },

  _saveSet(set) {
    storage.setJSON(SN.storage.bookmarks, [...set]);
  },

  has(courseId) {
    return this._getSet().has(Number(courseId));
  },

  add(courseId) {
    const set = this._getSet();
    set.add(Number(courseId));
    this._saveSet(set);
    // sync with backend if logged in
    if (auth.isLoggedIn()) api.bookmarks.add(courseId).catch(() => {});
    events.emit('bookmark:add', courseId);
  },

  remove(courseId) {
    const set = this._getSet();
    set.delete(Number(courseId));
    this._saveSet(set);
    if (auth.isLoggedIn()) api.bookmarks.remove(courseId).catch(() => {});
    events.emit('bookmark:remove', courseId);
  },

  toggle(courseId, btnEl) {
    const isSaved = this.has(courseId);
    if (isSaved) {
      this.remove(courseId);
      toast.info('Removed from saved');
    } else {
      this.add(courseId);
      toast.success('Saved to your list!');
    }

    // Update button UI
    if (btnEl) {
      btnEl.classList.toggle('saved', !isSaved);
      const svg = btnEl.querySelector('svg');
      if (svg) svg.setAttribute('fill', !isSaved ? 'currentColor' : 'none');
    }
    return !isSaved;
  },

  getAll() {
    return [...this._getSet()];
  },
};


/* ═══════════════════════════════════════
   11. PROGRESS TRACKER
═══════════════════════════════════════ */
const progress = {
  /** Get progress for a course */
  get(courseId) {
    const key = `sn_progress_${courseId}`;
    return storage.getJSON(key) || { completed: [], percentage: 0 };
  },

  /** Mark lesson as complete */
  markComplete(courseId, lessonId) {
    const key  = `sn_progress_${courseId}`;
    const data = this.get(courseId);
    if (!data.completed.includes(lessonId)) {
      data.completed.push(lessonId);
    }
    storage.setJSON(key, data);
    if (auth.isLoggedIn()) api.users.updateProgress(courseId, lessonId).catch(() => {});
    events.emit('progress:update', { courseId, lessonId, data });
    return data;
  },

  /** Calculate percent given total lessons */
  percentage(courseId, total) {
    const data = this.get(courseId);
    return total > 0 ? Math.round((data.completed.length / total) * 100) : 0;
  },

  /** Animate progress bar fill */
  animateBar(barEl, pct, delay = 200) {
    if (!barEl) return;
    barEl.style.width = '0%';
    barEl.style.transition = 'none';
    setTimeout(() => {
      barEl.style.transition = 'width 1s cubic-bezier(0.34,1.56,0.64,1)';
      barEl.style.width = pct + '%';
    }, delay);
  },

  /** Animate all .progress-fill and .skill-fill on page */
  animateAll() {
    $$('.progress-fill, .skill-fill, .goal-bar-fill').forEach((el, i) => {
      const target = el.style.width || el.getAttribute('data-width');
      this.animateBar(el, parseFloat(target) || 0, 200 + i * 80);
    });
  },
};


/* ═══════════════════════════════════════
   12. FORM VALIDATION
═══════════════════════════════════════ */
const validate = {
  /** Validators */
  rules: {
    required: v => v.trim() !== '',
    email:    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    minLen:   (v, n) => v.trim().length >= n,
    maxLen:   (v, n) => v.trim().length <= n,
    match:    (v, v2) => v === v2,
    number:   v => !isNaN(Number(v)) && v !== '',
    url:      v => { try { new URL(v); return true; } catch { return false; } },
    phone:    v => /^\+?[\d\s\-()]{7,15}$/.test(v),
    noEmpty:  v => v.trim().length > 0,
  },

  /** Check a single field */
  field(inputEl, rules, errorEl) {
    const val = inputEl.value;
    let errorMsg = null;

    for (const [rule, arg] of Object.entries(rules)) {
      const fn = this.rules[rule];
      if (!fn) continue;
      const ok = arg === true ? fn(val) : fn(val, arg);
      if (!ok) {
        const msgs = {
          required: 'This field is required.',
          email:    'Please enter a valid email address.',
          minLen:   `Must be at least ${arg} characters.`,
          maxLen:   `Must be no more than ${arg} characters.`,
          match:    'Values do not match.',
          number:   'Please enter a valid number.',
          url:      'Please enter a valid URL.',
          phone:    'Please enter a valid phone number.',
        };
        errorMsg = msgs[rule] || 'Invalid input.';
        break;
      }
    }

    inputEl.classList.toggle('has-error', !!errorMsg);
    inputEl.classList.toggle('is-valid', !errorMsg);
    if (errorEl) {
      errorEl.textContent = errorMsg || '';
      errorEl.classList.toggle('show', !!errorMsg);
    }
    return !errorMsg;
  },

  /** Validate entire form */
  form(formEl) {
    let valid = true;
    $$('[data-validate]', formEl).forEach(input => {
      const rules = JSON.parse(input.dataset.validate);
      const errorEl = $('#' + input.dataset.error);
      if (!this.field(input, rules, errorEl)) valid = false;
    });
    return valid;
  },

  /** Show global form error */
  showError(alertId, message) {
    const el = $(`#${alertId}`);
    if (!el) return;
    el.querySelector('span') && (el.querySelector('span').textContent = message);
    el.classList.add('show');
    dom.scrollTo(el, 100);
  },

  hideError(alertId) {
    $(`#${alertId}`)?.classList.remove('show');
  },

  /** Clear all errors in a container */
  clearAll(ctx = document) {
    $$('.has-error', ctx).forEach(el => el.classList.remove('has-error'));
    $$('.is-valid', ctx).forEach(el => el.classList.remove('is-valid'));
    $$('.field-error.show', ctx).forEach(el => el.classList.remove('show'));
    $$('.alert-error.show', ctx).forEach(el => el.classList.remove('show'));
  },
};


/* ═══════════════════════════════════════
   13. SCROLL & ANIMATION
═══════════════════════════════════════ */
const scroll = {
  /** IntersectionObserver for reveal-on-scroll */
  initReveal(selector = '.reveal', options = {}) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, ...options });

    $$(selector).forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
      io.observe(el);
    });

    // Inject revealed style
    if (!$('#reveal-style')) {
      const style = document.createElement('style');
      style.id = 'reveal-style';
      style.textContent = '.revealed { opacity: 1 !important; transform: translateY(0) !important; }';
      document.head.appendChild(style);
    }
  },

  /** Sticky topbar highlight on scroll */
  initActiveSection(tabSel, sectionSel) {
    const tabs     = $$(tabSel);
    const sections = $$(sectionSel);
    if (!tabs.length || !sections.length) return;

    const onScroll = throttle(() => {
      let current = sections[0]?.id || '';
      sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 140) current = sec.id;
      });
      tabs.forEach(tab => {
        const active = tab.dataset.section === current || tab.getAttribute('onclick')?.includes(current);
        tab.classList.toggle('active', active);
      });
    }, 100);

    window.addEventListener('scroll', onScroll, { passive: true });
  },

  /** Back-to-top button */
  initBackToTop(btnId = 'back-to-top') {
    const btn = $(`#${btnId}`);
    if (!btn) return;
    window.addEventListener('scroll', throttle(() => {
      btn.style.opacity = window.scrollY > 400 ? '1' : '0';
      btn.style.pointerEvents = window.scrollY > 400 ? 'all' : 'none';
    }, 150), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  /** Smooth scroll links */
  initSmoothLinks() {
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = $(link.getAttribute('href'));
        if (target) { e.preventDefault(); dom.scrollTo(target); }
      });
    });
  },
};


/* ═══════════════════════════════════════
   14. STORAGE HELPERS
═══════════════════════════════════════ */
const storage = {
  get(key)           { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, val)      { try { localStorage.setItem(key, val); } catch {} },
  remove(key)        { try { localStorage.removeItem(key); } catch {} },
  getJSON(key)       { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  setJSON(key, val)  { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  clear()            { try { localStorage.clear(); } catch {} },
  has(key)           { return this.get(key) !== null; },
};


/* ═══════════════════════════════════════
   15. DATE & TIME UTILITIES
═══════════════════════════════════════ */
const dt = {
  /** Format: "15 May 2026" */
  format(date, locale = 'en-IN') {
    return new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  },

  /** Format: "2 hours ago" */
  timeAgo(date) {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60)     return 'Just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 2592000)return `${Math.floor(diff / 604800)} weeks ago`;
    return this.format(date);
  },

  /** Format minutes as "2h 15m" */
  duration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  },

  /** Format seconds as "4:32" */
  formatSeconds(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  /** Today's greeting */
  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  },

  /** Format date for display */
  today(locale = 'en-IN') {
    return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },
};


/* ═══════════════════════════════════════
   16. STRING UTILITIES
═══════════════════════════════════════ */
const str = {
  /** Truncate with ellipsis */
  truncate(s, n = 60) {
    return s && s.length > n ? s.slice(0, n).trim() + '…' : s;
  },

  /** Escape HTML special chars */
  escape(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /** Slugify for URLs */
  slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },

  /** Capitalise first letter */
  capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  },

  /** Format number: 12400 → "12,400" */
  formatNumber(n) {
    return Number(n).toLocaleString('en-IN');
  },

  /** Format large number: 12400 → "12.4K" */
  formatCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  },

  /** Get initials from name */
  initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  /** Highlight search query in text */
  highlight(text, query) {
    if (!query) return str.escape(text);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return str.escape(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  },
};


/* ═══════════════════════════════════════
   17. DEBOUNCE & THROTTLE
═══════════════════════════════════════ */
function debounce(fn, wait = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, limit = 200) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn.apply(this, args); }
  };
}


/* ═══════════════════════════════════════
   18. EVENT BUS
═══════════════════════════════════════ */
const events = {
  _listeners: {},

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  },

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },

  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error('Event error:', event, e); }
    });
  },

  once(event, fn) {
    const off = this.on(event, (data) => { fn(data); off(); });
  },
};


/* ═══════════════════════════════════════
   19. PAGE INIT ROUTER
═══════════════════════════════════════ */
const pageRouter = {
  handlers: {},

  register(page, fn) {
    this.handlers[page] = fn;
    return this;
  },

  run() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const fn   = this.handlers[page] || this.handlers['*'];
    if (fn) {
      try { fn(); }
      catch (e) { console.error(`Page init error [${page}]:`, e); }
    }
  },
};


/* ═══════════════════════════════════════
   20. DOMContentLoaded BOOTSTRAP
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Global inits (all pages) ── */
  navbar.init();
  scroll.initSmoothLinks();
  scroll.initReveal('.course-card, .stat-card, .panel-card, .category-card, .step-card, .testimonial-card');
  progress.animateAll();

  /* ── Back-to-top ── */
  scroll.initBackToTop();

  /* ── Topbar scroll ── */
  const topbar = $('.topbar, .navbar');
  if (topbar) {
    window.addEventListener('scroll', throttle(() => {
      topbar.classList.toggle('scrolled', window.scrollY > 20);
    }, 100), { passive: true });
  }

  /* ── Update greeting in welcome banner ── */
  const greetingEl = $('.welcome-greeting');
  if (greetingEl) greetingEl.textContent = dt.today();

  const welcomeName = $('.welcome-name');
  if (welcomeName) {
    const user = auth.user();
    if (user?.name) welcomeName.textContent = `${dt.greeting()}, ${user.name.split(' ')[0]}!`;
  }

  /* ── Auth-gated pages ── */
  const protectedPages = ['dashboard.html', 'add-course.html'];
  const currentPage    = window.location.pathname.split('/').pop();
  if (protectedPages.includes(currentPage)) auth.requireLogin();

  /* ── Page-specific inits ── */
  pageRouter
    .register('index.html', initHomePage)
    .register('explore.html', initExplorePage)
    .register('course.html', initCoursePage)
    .register('login.html', initLoginPage)
    .register('register.html', initRegisterPage)
    .register('dashboard.html', initDashboardPage)
    .register('add-course.html', initAddCoursePage)
    .run();
});


/* ═══════════════════════════════════════
   PAGE INIT FUNCTIONS
═══════════════════════════════════════ */

/** index.html */
function initHomePage() {
  // Navbar search redirect
  const navSearch = $('.nav-search input');
  navSearch?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      search.saveRecent(e.target.value.trim());
      window.location.href = `${SN.routes.explore}?q=${encodeURIComponent(e.target.value.trim())}`;
    }
  });

  // Category card clicks
  $$('.category-card[data-cat]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `${SN.routes.explore}?cat=${card.dataset.cat}`;
    });
  });

  // Restore search query from URL
  const q = new URLSearchParams(window.location.search).get('q');
  if (q && navSearch) navSearch.value = q;
}


/** explore.html */
function initExplorePage() {
  // Restore URL params
  const params = new URLSearchParams(window.location.search);
  const q   = params.get('q');
  const cat = params.get('cat');

  if (q) {
    const input = $('#hero-search');
    if (input) input.value = q;
    search.state.query = q;
  }

  if (cat) {
    $$('.chip').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
    search.state.category = cat;
  }

  // View toggle (grid/list)
  const gridBtn   = $('#grid-btn');
  const listBtn   = $('#list-btn');
  const coursesGrid = $('#courses-grid');

  gridBtn?.addEventListener('click', () => {
    coursesGrid?.classList.remove('list-view');
    gridBtn.classList.add('active');
    listBtn?.classList.remove('active');
    storage.set('sn_view', 'grid');
  });

  listBtn?.addEventListener('click', () => {
    coursesGrid?.classList.add('list-view');
    listBtn.classList.add('active');
    gridBtn?.classList.remove('active');
    storage.set('sn_view', 'list');
  });

  // Restore view preference
  if (storage.get('sn_view') === 'list') listBtn?.click();

  // Price range label update
  const rangeInput = $('#price-range');
  const rangeLabel = $('#price-val');
  rangeInput?.addEventListener('input', () => {
    if (rangeLabel) rangeLabel.textContent = `${SN.currency}${rangeInput.value}`;
  });

  // Remove active filter tags
  $$('.active-filter-tag button').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.active-filter-tag')?.remove());
  });

  // Pagination
  $$('.page-btn:not(.arrow)').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.page-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}


/** course.html */
function initCoursePage() {
  // Tab nav active on scroll
  scroll.initActiveSection('.tab-btn', '.section-block[id]');

  // Bookmark button
  $$('.bookmark-btn').forEach(btn => {
    const courseId = btn.dataset.courseId || 1;
    if (bookmarks.has(courseId)) {
      btn.classList.add('saved');
    }
    btn.addEventListener('click', e => {
      e.stopPropagation();
      bookmarks.toggle(courseId, btn);
    });
  });

  // Accordion
  $$('.accordion-header').forEach(header => {
    header.addEventListener('click', function () {
      const body = this.nextElementSibling;
      const open = this.classList.contains('open');
      this.classList.toggle('open', !open);
      body?.classList.toggle('open', !open);
    });
  });

  // Review helpful buttons
  $$('.helpful-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const count = parseInt(this.textContent.match(/\d+/)?.[0] || '0');
      this.textContent = this.textContent.replace(/\d+/, count + 1);
      this.disabled = true;
      this.style.borderColor = 'var(--brand)';
      this.style.color = 'var(--brand)';
    });
  });
}


/** login.html */
function initLoginPage() {
  // If already logged in, redirect
  if (auth.isLoggedIn()) {
    window.location.href = SN.routes.dashboard;
    return;
  }

  const form      = $('#login-form') || document.querySelector('form');
  const emailInp  = $('#email');
  const passInp   = $('#password');
  const submitBtn = $('#submit-btn');

  // Live email validation
  emailInp?.addEventListener('input', debounce(() => {
    validate.field(emailInp, { email: true }, $('#email-error'));
  }, 500));

  // Form submit
  const handleSubmit = async () => {
    validate.clearAll();
    let valid = true;
    if (!validate.field(emailInp, { required: true, email: true }, $('#email-error'))) valid = false;
    if (!validate.field(passInp,  { required: true, minLen: 6 },   $('#password-error'))) valid = false;
    if (!valid) return;

    // Loading state
    const btnText = submitBtn?.querySelector('#btn-text');
    const arrow   = submitBtn?.querySelector('#btn-arrow');
    const spinner = submitBtn?.querySelector('#btn-spinner');
    if (submitBtn) submitBtn.disabled = true;
    if (btnText)   btnText.textContent = 'Logging in…';
    if (arrow)     arrow.style.display = 'none';
    if (spinner)   spinner.style.display = 'block';

    try {
      await auth.login(emailInp.value.trim(), passInp.value);
      toast.success('Welcome back!');
      auth.redirectAfterLogin();
    } catch (err) {
      validate.showError('alert-error', err.message || 'Invalid email or password.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText)   btnText.textContent = 'Log In';
      if (arrow)     arrow.style.display = 'block';
      if (spinner)   spinner.style.display = 'none';
    }
  };

  submitBtn?.addEventListener('click', handleSubmit);
  document.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
}


/** register.html */
function initRegisterPage() {
  if (auth.isLoggedIn()) {
    window.location.href = SN.routes.dashboard;
    return;
  }

  // Password strength meter (if not already handled inline)
  const passInp = $('#password');
  if (passInp && !passInp.dataset.strengthBound) {
    passInp.dataset.strengthBound = '1';
    passInp.addEventListener('input', () => {
      const val = passInp.value;
      const score = [
        val.length >= 8,
        /[A-Z]/.test(val),
        /[0-9]/.test(val),
        /[^A-Za-z0-9]/.test(val),
      ].filter(Boolean).length;

      [1,2,3,4].forEach(i => {
        const bar = $(`#bar-${i}`);
        if (!bar) return;
        const cls = ['','weak','fair','good','strong'][score];
        bar.className = 'strength-bar' + (i <= score ? ` ${cls}` : '');
      });
    });
  }
}


/** dashboard.html */
function initDashboardPage() {
  // Welcome greeting
  const user = auth.user();
  if (user?.name) {
    const el = $('.welcome-name');
    if (el) el.textContent = `${dt.greeting()}, ${user.name.split(' ')[0]}!`;
  }

  // Today's date
  const dateEl = $('.welcome-greeting');
  if (dateEl) dateEl.textContent = dt.today();

  // Topbar search → explore
  const tsearch = $('.topbar-search input');
  tsearch?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = `${SN.routes.explore}?q=${encodeURIComponent(e.target.value.trim())}`;
    }
  });

  // Progress bar animations (staggered)
  progress.animateAll();
}


/** add-course.html */
function initAddCoursePage() {
  // Live title preview
  const titleInp = $('#course-title');
  titleInp?.addEventListener('input', () => {
    const previewTitle = $('#preview-title');
    if (previewTitle) previewTitle.textContent = titleInp.value || 'Your course title will appear here';
    const counter = $('#title-count');
    if (counter) counter.textContent = `${titleInp.value.length} / 80`;
  });

  // Live desc counter
  const descInp = $('#course-desc');
  descInp?.addEventListener('input', () => {
    const counter = $('#desc-count');
    if (counter) counter.textContent = `${descInp.value.length} / 160`;
  });

  // Category → preview meta
  ['#category','#level'].forEach(sel => {
    $(sel)?.addEventListener('change', () => {
      const cat = $('#category')?.value || 'Category';
      const lvl = $('#level')?.value || 'Level';
      const el  = $('#preview-meta');
      if (el) el.innerHTML = `<span>${str.escape(cat)}</span><span>·</span><span>${str.escape(lvl)}</span>`;
    });
  });

  // Warn on unload if form has changes
  let formDirty = false;
  $$('#panel-1 input, #panel-1 textarea, #panel-1 select').forEach(el => {
    el.addEventListener('input', () => { formDirty = true; });
  });
  window.addEventListener('beforeunload', e => {
    if (formDirty) { e.preventDefault(); e.returnValue = ''; }
  });
}


/* ═══════════════════════════════════════
   EXPOSE GLOBALS (for inline HTML usage)
═══════════════════════════════════════ */
window.SN         = SN;
window.toast      = toast;
window.modal      = modal;
window.bookmarks  = bookmarks;
window.auth       = auth;
window.validate   = validate;
window.progress   = progress;
window.search     = search;
window.courses    = courses;
window.storage    = storage;
window.dt         = dt;
window.str        = str;
window.events     = events;
window.debounce   = debounce;
window.throttle   = throttle;
window.$          = $;
window.$$         = $$;
window.dom        = dom;