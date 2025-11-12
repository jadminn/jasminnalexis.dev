/*********************************
 * Utility: qs / qsa
 *********************************/
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];

/*********************************
 * Mobile nav
 *********************************/
(function mobileNav() {
  const toggle = qs('.nav-toggle');
  const nav = qs('[data-nav]');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Close on link click (useful on mobile)
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

/*********************************
 * Dynamic year
 *********************************/
(function setYear() {
  const y = qs('#year');
  if (y) y.textContent = new Date().getFullYear();
})();

/*********************************
 * Hero mode rotator (themes) — with Play/Pause button
 *  - Uses wordsText for width measurement
 *  - Uses wordsHTML for styled display (no layout jank)
 *********************************/
const HERO_MODES = [
  {
    key: 'clean',
    title: 'Front-End Developer',
    wordsText: 'clean, fast, accessible',
    wordsHTML: 'clean, fast, accessible',
    className: 'theme-clean'
  },
  {
    key: 'artist',
    title: 'Artist',
    wordsText: 'beautiful, creative , fun ',
    wordsHTML:
      "<span class='word-gradient'>beautiful</span>, " +
      "<span class='word-bob'>creative</span>, " +
      "<span class='word-fun'>fun</span>",
    className: 'theme-artist'
  },
  {
    key: 'innovator',
    title: 'Innovator',
    wordsText: 'custom, unique, bold',
    wordsHTML: '<u>custom</u>, <em>unique</em>, <strong>bold</strong>',
    className: 'theme-innovator'
  }
];


(function heroModes() {
  const titleEl = document.querySelector('#hero-title');
  const wordsEl = document.querySelector('#hero-words');
  const prevBtn = document.querySelector('#prevHero');
  const nextBtn = document.querySelector('#nextHero');

  // Play/Pause control (icon button)
  const autoBtn = document.querySelector('#autoBtn');

  if (!titleEl || !wordsEl) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = Number(localStorage.getItem('heroModeIndex') || 0) % HERO_MODES.length;
  let timer = null;
  let isAuto = true; // default ON

  function textSwap(el, next, { html = false } = {}) {
    const current = html ? el.innerHTML : el.textContent;
    if (!el || current === next) return;

    if (prefersReduced) {
      if (html) el.innerHTML = next; else el.textContent = next;
      return;
    }

    const out = el.cloneNode(true);
    out.classList.remove('swap-in');
    out.classList.add('swap-out');
    el.parentNode.appendChild(out);

    if (html) el.innerHTML = next; else el.textContent = next;
    el.classList.remove('swap-out');
    el.classList.add('swap-in');

    out.addEventListener('animationend', () => out.remove(), { once: true });
    el.addEventListener('animationend', () => el.classList.remove('swap-in'), { once: true });
  }

  async function applyMode(idx) {
    i = (idx + HERO_MODES.length) % HERO_MODES.length;
    const m = HERO_MODES[i];

    // Soften background change via your CSS overlay
    document.body.classList.add('is-fading');

    document.body.classList.remove(...HERO_MODES.map(x => x.className));
    document.body.classList.add(m.className);

    textSwap(titleEl, m.title, { html: false });
    textSwap(wordsEl, m.wordsHTML, { html: true });

    try { await setStableWidths(); } catch {}

    setTimeout(() => document.body.classList.remove('is-fading'), 480);
    localStorage.setItem('heroModeIndex', String(i));
  }

  function next() { applyMode(i + 1); }
  function prev() { applyMode(i - 1); }

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  function startAuto() {
    stopAuto();
    if (prefersReduced || !isAuto) return;
    timer = window.setInterval(next, 6000);
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

  function updateAutoUI() {
    if (!autoBtn) return;
    autoBtn.setAttribute('aria-pressed', String(isAuto));
    autoBtn.setAttribute('aria-label', isAuto ? 'Pause rotation' : 'Play rotation');
    autoBtn.title = isAuto ? 'Pause' : 'Play';

    autoBtn.innerHTML = isAuto
      ? `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
           <rect x="6" y="5" width="4" height="14" rx="1"></rect>
           <rect x="14" y="5" width="4" height="14" rx="1"></rect>
         </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
           <path d="M8 5v14l11-7-11-7z"></path>
         </svg>`;
  }

  autoBtn?.addEventListener('click', () => {
    isAuto = !isAuto;
    updateAutoUI();
    isAuto ? startAuto() : stopAuto();
  });

  // init
  applyMode(i);
  updateAutoUI();
  startAuto();
  document.addEventListener('visibilitychange', () => document.hidden ? stopAuto() : startAuto());
})();

/*********************************
 * Width stabilizer (hero text)
 * - Measures plain words (wordsText)
 * - Keeps visual swap area fixed
 *********************************/
function measureMaxWidth(texts, sampleEl) {
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  probe.style.whiteSpace = 'nowrap';

  const cs = getComputedStyle(sampleEl);
  probe.style.font = cs.font;
  probe.style.letterSpacing = cs.letterSpacing;
  probe.style.fontWeight = cs.fontWeight;
  probe.style.fontSize = cs.fontSize;

  document.body.appendChild(probe);

  let max = 0;
  for (const t of texts) {
    probe.textContent = t;
    const w = probe.getBoundingClientRect().width;
    if (w > max) max = w;
  }
  probe.remove();
  return Math.ceil(max);
}

async function setStableWidths() {
  const titleEl = qs('#hero-title');
  const wordsEl = qs('#hero-words');
  if (!titleEl || !wordsEl) return;

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }

  const titleTexts = HERO_MODES.map(m => m.title);
  const wordsTexts = HERO_MODES.map(m => m.wordsText); // measure plain strings

  const titleW = measureMaxWidth(titleTexts, titleEl);
  const wordsW = measureMaxWidth(wordsTexts, wordsEl);

  document.documentElement.style.setProperty('--swap-title-w', titleW + 'px');
  document.documentElement.style.setProperty('--swap-words-w', wordsW + 'px');
}

let _resizeT;
window.addEventListener('resize', () => {
  clearTimeout(_resizeT);
  _resizeT = setTimeout(setStableWidths, 150);
});
setStableWidths();

/*********************************
 * Recent Projects — Pagination
 * - Reads JSON from #projects-data
 * - Renders 6 per page into #projects-grid
 * - Updates pager, dots, and counters
 *********************************/
(function projectsPager() {
  const PAGE_SIZE = 6;

  const dataEl = qs('#projects-data');
  const gridEl = qs('#projects-grid');
  const pageEl = qs('#proj-page');
  const pagesEl = qs('#proj-pages');
  const prevBtn = qs('#proj-prev');
  const nextBtn = qs('#proj-next');
  const dotsEl = qs('#proj-dots');

  if (!dataEl || !gridEl || !pageEl || !pagesEl || !prevBtn || !nextBtn || !dotsEl) return;

  let items = [];
  try {
    const json = JSON.parse(dataEl.textContent || '{}');
    items = Array.isArray(json.items) ? json.items : [];
  } catch (e) {
    console.warn('Invalid projects JSON', e);
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  pagesEl.textContent = String(totalPages);

  function cardHTML(p) {
    const links = (p.links || []).map(l => {
      const target = l.external ? ' target="_blank" rel="noopener"' : '';
      return `<a class="btn" href="${l.href}"${target}>${l.label}</a>`;
    }).join('');
    return `
      <article class="card">
        <img src="${p.img}" alt="${p.alt ? String(p.alt).replace(/"/g,'&quot;') : ''}">
        <div class="card-body">
          <h3>${p.title || ''}</h3>
          <p>${p.blurb || ''}</p>
          <div class="links">${links}</div>
        </div>
      </article>
    `;
  }

  function updateHash(page) {
    const base = location.href.split('#')[0];
    const hash = `#projects?page=${page}`;
    history.replaceState(null, '', base + hash);
  }

  function renderDots(current, total) {
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) => {
      const idx = i + 1;
      const active = idx === current ? 'active' : '';
      return `<button class="dot ${active}" aria-label="Go to page ${idx}" data-page="${idx}" title="Page ${idx}"></button>`;
    }).join('');
    qsa('.pager-dots .dot', dotsEl).forEach(btn => {
      btn.addEventListener('click', () => renderPage(Number(btn.dataset.page)));
    });
  }

  function renderPage(page) {
    const current = Math.min(Math.max(1, page), totalPages);
    const start = (current - 1) * PAGE_SIZE;
    const visible = items.slice(start, start + PAGE_SIZE);

    gridEl.innerHTML = visible.map(cardHTML).join('');
    pageEl.textContent = String(current);

    prevBtn.disabled = current === 1;
    nextBtn.disabled = current === totalPages;

    renderDots(current, totalPages);
    updateHash(current);
  }

  prevBtn.addEventListener('click', () => {
    const p = Number(pageEl.textContent || '1') - 1;
    renderPage(p);
  });
  nextBtn.addEventListener('click', () => {
    const p = Number(pageEl.textContent || '1') + 1;
    renderPage(p);
  });

  let initial = 1;
  if (location.hash) {
    const m = location.hash.match(/page=(\d+)/i);
    if (m) initial = parseInt(m[1], 10) || 1;
  }
  renderPage(initial);
})();

// === Themed click splats (artist = paint, innovator = ink) ===
(() => {
  const body = document.body;
  const isFinePointer = window.matchMedia && matchMedia('(pointer:fine)').matches;

  // Limit total splats in DOM for perf
  const MAX_SPLATS = 24;

  function activeTheme() {
    if (body.classList.contains('theme-artist')) return 'artist';
    if (body.classList.contains('theme-innovator')) return 'innovator';
    return 'clean';
  }

function makeSplat(x, y) {
  const theme = activeTheme();
  if (theme === 'clean') return;

  // size & rotation
  const size = theme === 'artist'
    ? 44 + Math.random() * 96     // paint: 44–140px
    : 36 + Math.random() * 84;    // ink  : 36–120px
  const rot  = Math.floor(Math.random() * 360);
  const scale = (0.85 + Math.random() * 0.6).toFixed(2);

  const el = document.createElement('span');
  el.className = 'splat ' + (theme === 'artist' ? 'splat--paint' : 'splat--ink');

  // Color variant for paint
  let paintFill = null;
  if (theme === 'artist') {
    const palette = [
      {cls:'red',    hex:'#d32b2b'},
      {cls:'yellow', hex:'#f5cd3b'},
      {cls:'blue',   hex:'#3c64f2'}
    ];
    const pick = palette[Math.floor(Math.random() * palette.length)];
    el.classList.add(pick.cls);
    paintFill = pick.hex;
  }

  // position + animation vars
  el.style.width = el.style.height = size + 'px';
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  el.style.setProperty('--srot', rot + 'deg');
  el.style.setProperty('--sscale', scale);

  // Limit DOM bloat
  const existing = document.querySelectorAll('.splat');
  if (existing.length >= MAX_SPLATS) existing[0]?.remove();

  // For ARTIST: build an SVG “burst + drips”; for INK: keep CSS blob
  if (theme === 'artist') {
  const splatImg = document.createElement('img');
  const totalSplats = 3; // number of images you have
  const imgIndex = 1 + Math.floor(Math.random() * totalSplats);
  splatImg.src = `assets/splats/splat${imgIndex}.png`;
  splatImg.alt = "";
  splatImg.className = "splat-img";
  splatImg.draggable = false;

  // add one of three paint colors
  const palette = [
    { cls: "red",    color: "invert(13%) sepia(97%) saturate(7480%) hue-rotate(-10deg) brightness(92%) contrast(104%)" },
    { cls: "yellow", color: "invert(84%) sepia(78%) saturate(541%) hue-rotate(5deg) brightness(108%) contrast(97%)" },
    { cls: "blue",   color: "invert(25%) sepia(82%) saturate(3940%) hue-rotate(221deg) brightness(97%) contrast(101%)" }
  ];
  const pick = palette[Math.floor(Math.random() * palette.length)];
  splatImg.style.filter = pick.color;
  el.classList.add(pick.cls);

  el.appendChild(splatImg);
}


  document.body.appendChild(el);
  const cleanup = () => el.remove();
  el.addEventListener('animationend', cleanup, { once: true });
  setTimeout(cleanup, 1600);
}

/* ---------- helpers ---------- */

  // Don’t splat when clicking on interactive controls
  function isInteractiveTarget(t) {
    return t.closest?.('a,button,[role="button"],input,textarea,select,details,summary,[contenteditable="true"]');
  }

  // Pointer events work for both mouse & touch nicely
  function onPointerDown(e) {
    // Only primary button for mouse, ignore right/middle
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;

    // Prefer clientX/Y (page is fine too, we position fixed)
    makeSplat(e.clientX, e.clientY);
  }

  // Enable on fine pointers & touch; coarse-only devices still get it on tap
  window.addEventListener('pointerdown', onPointerDown, { passive: true });

  // Optional: keyboard accessibility—Space/Enter splats centered (only if not on inputs)
  window.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !isInteractiveTarget(e.target)) {
      const x = Math.round(window.innerWidth / 2);
      const y = Math.round(window.innerHeight / 2);
      makeSplat(x, y);
    }
  });
})();
