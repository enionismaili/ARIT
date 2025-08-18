// Sticky shadow on scroll
window.addEventListener("scroll", function () {
  const header = document.querySelector("header");
  if (window.scrollY > 10) header.classList.add("sticky-shadow");
  else header.classList.remove("sticky-shadow");
});

document.addEventListener("DOMContentLoaded", () => {
  // ===== Mobile menu =====
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      navLinks.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
        navLinks.classList.remove("open");
      }
    });
    navLinks.querySelectorAll("a").forEach(a =>
      a.addEventListener("click", () => navLinks.classList.remove("open"))
    );
  }

  // ===== Highlight active nav link (ALWAYS runs) =====
  let currentPage = window.location.pathname.split("/").pop() || "index.html";
  currentPage = currentPage.split("?")[0].split("#")[0];

  document.querySelectorAll(".nav-links a").forEach(link => {
    let linkPage = (link.getAttribute("href") || "").split("/").pop();
    linkPage = linkPage.split("?")[0].split("#")[0];
    if (linkPage === currentPage || (linkPage === "index.html" && currentPage === "index.html")) {
      link.classList.add("active");
    }
  });

  // ===== Contact form & phone validation (US-wide with real area codes) =====
  const form = document.getElementById("contact-form");
  const phoneInput = document.getElementById("phone");
  const successMessage = document.getElementById("success-message");

  if (phoneInput) {
    // Lazy-load libphonenumber-js (UMD bundle) once
    const LIB_URL = "https://unpkg.com/libphonenumber-js@1.11.3/bundle/libphonenumber-max.js";

    function loadLibPhone() {
      return new Promise((resolve, reject) => {
        if (window.libphonenumber && typeof window.libphonenumber.parsePhoneNumberFromString === "function") {
          resolve();
          return;
        }
        // Prevent injecting multiple times
        if (document.querySelector('script[data-libphonenumber]')) {
          // Wait until it becomes available
          const check = () => {
            if (window.libphonenumber && typeof window.libphonenumber.parsePhoneNumberFromString === "function") resolve();
            else setTimeout(check, 50);
          };
          check();
          return;
        }
        const s = document.createElement("script");
        s.src = LIB_URL;
        s.async = true;
        s.defer = true;
        s.setAttribute("data-libphonenumber", "true");
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load libphonenumber-js"));
        document.head.appendChild(s);
      });
    }

    // Strict NANP structural fallback (used only if CDN fails)
    const NANP_STRICT = /^(?:\+1[\s\-\.]?)?(?:\(?([2-9]\d{2})\)?[\s\-\.]?)?([2-9]\d{2})[\s\-\.]?(\d{4})$/;

    function validatePhone() {
      const raw = phoneInput.value.trim();
      if (!raw) {
        phoneInput.setCustomValidity("");
        phoneInput.reportValidity();
        return;
      }

      // While library loads, do nothing intrusive; finalize validity once ready
      loadLibPhone()
        .then(() => {
          const digits = raw.replace(/\D/g, "");
          const candidate = digits.length === 10 ? `+1${digits}` : raw;
          const parsed = window.libphonenumber.parsePhoneNumberFromString(candidate, "US");
          const isValid = !!parsed && parsed.isValid() && parsed.country === "US";
          phoneInput.setCustomValidity(isValid ? "" : "Enter a valid U.S. phone number");
        })
        .catch(() => {
          // Fallback: structure-only (does not verify currently assigned/active area codes)
          const digits = raw.replace(/\D/g, "");
          const isTenOrEleven = digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
          const structureOk = NANP_STRICT.test(raw);
          const isValid = isTenOrEleven && structureOk;
          phoneInput.setCustomValidity(isValid ? "" : "Enter a valid U.S. phone number");
        })
        .finally(() => {
          phoneInput.reportValidity();
        });
    }

    phoneInput.addEventListener("blur", validatePhone);
    phoneInput.addEventListener("input", validatePhone);
  }


  if (form) {
    form.addEventListener("submit", (e) => {
      if (phoneInput) {
        const beforeValid = phoneInput.checkValidity();
        if (!beforeValid) {
          e.preventDefault();
          return;
        }
      }
      // fetch handler only if you actually submit via JS; otherwise remove this block
      const formData = new FormData(form);
      fetch(form.action, { method: "POST", body: formData, headers: { Accept: "application/json" } })
        .then(r => {
          if (r.ok) {
            form.reset();
            if (successMessage) successMessage.style.display = "block";
          } else {
            alert("❌ There was a problem submitting the form. Please try again.");
          }
        })
        .catch(() => alert("⚠️ Network error. Please try again later."));
      e.preventDefault(); // prevent default if using fetch
    });
  }


  // ===== Reviews carousel (guarded) =====
  const track = document.getElementById("carouselTrack");
  const container = document.querySelector(".carousel-container");
  const btnPrev = document.getElementById("carouselPrev");
  const btnNext = document.getElementById("carouselNext");
  if (!(track && container && btnPrev && btnNext)) return;

  const originals = Array.from(track.querySelectorAll(".review-card"));
  let index = 0, V = 1, interval = null, isSnapping = false;

  function visibleCount() {
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 991) return 2;
    return 3;
  }

  function cardStep() {
    const card = track.querySelector(".review-card");
    if (!card) return 0;
    const w = card.getBoundingClientRect().width;
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "0");
    return w + gap;
  }

  function setTransform(i, instant = false) {
    const step = cardStep();
    if (!step) return;
    if (instant) track.style.transition = "none";
    track.style.transform = `translateX(-${i * step}px)`;
    if (instant) requestAnimationFrame(() => {
      track.style.transition = "transform 0.5s ease-in-out";
    });
  }

  // TRUE infinite: clone V at both ends and start at offset V
  function setupClones() {
    // remove previous clones
    track.querySelectorAll(".review-card.__clone").forEach(n => n.remove());

    V = Math.min(visibleCount(), originals.length);

    // prepend last V
    for (let i = originals.length - V; i < originals.length; i++) {
      const c = originals[i].cloneNode(true);
      c.classList.add("__clone");
      track.insertBefore(c, track.firstChild);
    }
    // append first V
    for (let i = 0; i < V; i++) {
      const c = originals[i].cloneNode(true);
      c.classList.add("__clone");
      track.appendChild(c);
    }

    // start at first real
    index = V;
    setTransform(index, true);
  }

  function slideNext() {
    if (isSnapping) return;
    index++;
    setTransform(index);
  }

  function slidePrev() {
    if (isSnapping) return;
    index--;
    setTransform(index);
  }

  function startAuto() { clearInterval(interval); interval = setInterval(slideNext, 3000); }
  function stopAuto() { clearInterval(interval); }

  // Snap invisibly when we enter clones
  track.addEventListener("transitionend", () => {
    const firstReal = V;
    const lastReal = V + originals.length - 1;

    if (index > lastReal) {
      isSnapping = true;
      index = firstReal;
      setTransform(index, true);
      isSnapping = false;
    } else if (index < firstReal) {
      isSnapping = true;
      index = lastReal;
      setTransform(index, true);
      isSnapping = false;
    }
  });

  // Init
  setupClones();
  startAuto();

  // Interactions
  container.addEventListener("mouseenter", stopAuto);
  container.addEventListener("mouseleave", startAuto);
  btnNext.addEventListener("click", () => { stopAuto(); slideNext(); startAuto(); });
  btnPrev.addEventListener("click", () => { stopAuto(); slidePrev(); startAuto(); });
  container.setAttribute("tabindex", "0");
  container.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { stopAuto(); slideNext(); startAuto(); }
    if (e.key === "ArrowLeft") { stopAuto(); slidePrev(); startAuto(); }
  });

  // Rebuild on resize (so V/step update) and keep it seamless
  window.addEventListener("resize", () => {
    stopAuto();
    setupClones();
    startAuto();
  });
});



(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const overlay = document.createElement('div');
  overlay.className = 'paint-overlay';
  overlay.id = 'paintOverlay';
  overlay.setAttribute('aria-hidden', 'true');

  const veilHost = document.createElement('div');
  veilHost.id = 'veilHost';
  overlay.appendChild(veilHost);

  const canvas = document.createElement('canvas');
  canvas.id = 'rollerCanvas';
  overlay.appendChild(canvas);

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(overlay);
    startPaintIntro(overlay, veilHost, canvas);
  });

  function startPaintIntro(overlay, veilHost, canvas) {
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const BASE = Number(css.getPropertyValue('--paint-duration-ms')) || 2200;
    const DURATION_MS = BASE;
    const LAG = Math.max(0, Math.min(.45, parseFloat(css.getPropertyValue('--paint-reveal-lag')) || .10));
    const EASE = t => (t < .5) ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const ROLLER_DARK = (css.getPropertyValue('--roller-dark') || '#cdd4da').trim();
    const ROLLER_LIGHT = (css.getPropertyValue('--roller-light') || '#e6eaee').trim();

    const COL = {
      headDark: ROLLER_DARK,
      headLight: ROLLER_LIGHT,
      arm: '#8e99a6',
      handle: '#1f2530',
      handleIn: '#2b333f',
      accent: '#ffc72c',
      shadow: 'rgba(0,0,0,.18)'
    };

    let W = 0, H = 0, dpr = 1, rollers = [], start = 0, running = false;

    function decideCount(vw) { return vw < 786 ? 1 : 2; }

    function setCanvasSize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      W = Math.round(r.width);
      H = Math.round(r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function roundedRect(c, x, y, w, h, r) {
      const rr = Math.min(r, h / 2, w / 2);
      c.beginPath();
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    }

    function headPattern(headH, offset, dark, light) {
      const stripeW = Math.max(16, Math.round(headH * 0.35));
      const patW = stripeW * 2;
      const patH = Math.max(8, Math.round(headH * 0.65));
      const cv = document.createElement('canvas');
      cv.width = patW; cv.height = patH;
      const c2 = cv.getContext('2d');

      c2.fillStyle = light; c2.fillRect(0, 0, patW, patH);
      const x = ((Math.round(offset) % patW) + patW) % patW;
      c2.fillStyle = dark; c2.fillRect(x, 0, stripeW, patH);

      const g = c2.createLinearGradient(0, 0, 0, patH);
      g.addColorStop(0.00, 'rgba(255,255,255,0.25)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.00)');
      g.addColorStop(1.00, 'rgba(0,0,0,0.10)');
      c2.fillStyle = g; c2.fillRect(0, 0, patW, patH);

      return ctx.createPattern(cv, 'repeat');
    }

    // SINGLE cover layer that spans entire width
    let singleClip = null;

    function build() {
      setCanvasSize();
      const count = decideCount(W);

      // Reset host & rollers
      veilHost.innerHTML = '';
      rollers.length = 0;

      // Create ONE clip/pane covering full width/height
      singleClip = document.createElement('div');
      singleClip.className = 'cover-clip';
      singleClip.style.left = '0px';
      singleClip.style.width = W + 'px';
      singleClip.style.setProperty('--revealY', '0px');

      const pane = document.createElement('div');
      pane.className = 'cover-pane';
      singleClip.appendChild(pane);
      veilHost.appendChild(singleClip);

      // Build rollers (1 for phone, 2 for desktop) — both share the SAME clip/pane
      const segW = W / count;
      const segGap = Math.max(16, Math.round(W * 0.015));
      const headH = Math.max(60, Math.min(110, Math.round(W * (count === 1 ? 0.08 : 0.055))));

      for (let i = 0; i < count; i++) {
        const segX = Math.round(i * segW);
        const headX = segX + segGap;

        let armLen = Math.max(50, Math.min(110, Math.round(W * 0.05)));
        let handleW = Math.max(22, Math.min(34, Math.round(W * 0.022)));
        const handleH = Math.max(90, Math.min(140, Math.round(W * 0.11)));
        const safety = Math.max(8, Math.round(W * 0.005));
        let headW = Math.round(segW - segGap * 2 - armLen - handleW - safety);

        const minHead = 180;
        if (headW < minHead) {
          const deficit = minHead - headW;
          const armMin = 40;
          const reducible = Math.max(0, armLen - armMin);
          const reduceBy = Math.min(deficit, reducible);
          armLen -= reduceBy; headW += reduceBy;
          if (headW < minHead && handleW > 18) {
            const extra = Math.min(minHead - headW, handleW - 18);
            handleW -= extra; headW += extra;
          }
        }

        rollers.push({
          segX, segW,
          headX, headY: 0, headW, headH, headR: Math.min(18, Math.round(headH / 3)),
          armLen, handleW, handleH,
          y: -headH - 24
        });
      }
    }

    function drawRoller(r, spinOffset) {
      const { headX, headY, headW, headH, headR, armLen, handleW, handleH, y } = r;
      const rightX = headX + headW;
      const armY = headY + headH / 2;
      const handleTop = headY + headH + 26;

      ctx.save();
      ctx.translate(0, y);

      // head base
      roundedRect(ctx, headX, headY, headW, headH, headR);
      ctx.fillStyle = COL.headLight; ctx.fill();
      ctx.strokeStyle = '#b7c0c9'; ctx.lineWidth = 1; ctx.stroke();

      // spin texture
      ctx.save();
      roundedRect(ctx, headX, headY, headW, headH, headR); ctx.clip();
      ctx.fillStyle = headPattern(headH, spinOffset, COL.headDark, COL.headLight);
      ctx.fillRect(headX, headY, headW, headH);
      ctx.restore();

      // arm
      ctx.lineCap = 'round'; ctx.strokeStyle = COL.arm; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(rightX - 12, armY);
      ctx.bezierCurveTo(rightX + 16, armY, rightX + 36, armY, rightX + armLen, armY);
      ctx.lineTo(rightX + armLen, handleTop);
      ctx.stroke();

      // joint accent
      ctx.fillStyle = '#ffc72c';
      ctx.beginPath(); ctx.arc(rightX - 8, armY, 2.6, 0, Math.PI * 2); ctx.fill();

      // handle
      const hx = rightX + armLen - Math.round(handleW / 2);
      const hy = handleTop;
      roundedRect(ctx, hx, hy, handleW, handleH, 8); ctx.fillStyle = COL.handle; ctx.fill();
      roundedRect(ctx, hx + 4, hy + 4, handleW - 8, handleH - 8, 6); ctx.fillStyle = COL.handleIn; ctx.fill();

      // subtle head shadow
      ctx.shadowColor = COL.shadow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'transparent';
      roundedRect(ctx, headX, headY, headW, headH, headR); ctx.fill();

      ctx.restore();
    }

    function animate() {
      running = true; start = performance.now();

      const loop = now => {
        if (!running) return;
        const tRaw = (now - start) / DURATION_MS;
        const t = Math.min(1, tRaw);
        const eased = EASE(t);

        ctx.clearRect(0, 0, W, H);

        // Draw rollers & compute reveal depth (they move in sync; still robust if not)
        let maxReveal = 0;

        rollers.forEach(r => {
          const over = Math.max(24, r.headH);
          r.y = -r.headH - 24 + eased * (H + over);

          const circumference = Math.max(60, r.headH * Math.PI);
          const spinOffset = (eased * circumference) % (r.headH * 0.36 + 12);
          drawRoller(r, spinOffset);

          const revealY = Math.max(0, Math.min(H, r.y + r.headH * 0.6));
          if (revealY > maxReveal) maxReveal = revealY;
        });

        // Update the single cover layer once
        if (singleClip) singleClip.style.setProperty('--revealY', maxReveal + 'px');

        if (t < 1) {
          requestAnimationFrame(loop);
        } else {
          if (singleClip) singleClip.style.setProperty('--revealY', H + 'px');
          overlay.classList.add('fade-out');
          overlay.addEventListener('animationend', () => overlay.setAttribute('hidden', ''), { once: true });
        }
      };

      requestAnimationFrame(loop);
    }

    function rebuildAndRestart() { build(); animate(); }
    function init() { build(); animate(); }

    const ro = new ResizeObserver(() => { setCanvasSize(); rebuildAndRestart(); });
    ro.observe(document.documentElement);

    setCanvasSize(); init();
  }
})();


(function () { 'use strict'; const rootMargin = '600px'; const inViewport = el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0; }; const areaInViewport = el => { const r = el.getBoundingClientRect(); const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)); const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); return w * h; }; const setIntrinsic = img => { if (img.hasAttribute('width') && img.hasAttribute('height')) return; const write = () => { if (img.naturalWidth && img.naturalHeight) { img.setAttribute('width', img.naturalWidth); img.setAttribute('height', img.naturalHeight); } }; img.complete ? write() : img.addEventListener('load', write, { once: true }); }; const promote = img => { img.setAttribute('loading', 'eager'); img.setAttribute('decoding', 'async'); img.setAttribute('fetchpriority', 'high'); }; const hydrate = img => { if (img.dataset.hydrated === '1') return; const pic = img.parentElement?.tagName === 'PICTURE' ? img.parentElement : null; if (pic) pic.querySelectorAll('source').forEach(s => s.dataset.srcset && (s.srcset = s.dataset.srcset)); if (img.dataset.srcset) img.srcset = img.dataset.srcset; if (img.dataset.sizes) img.sizes = img.dataset.sizes; if (img.dataset.src) img.src = img.dataset.src; img.dataset.hydrated = '1'; }; const ioImgs = new IntersectionObserver((entries, obs) => { entries.forEach(e => { if (!e.isIntersecting) return; const img = e.target; img.setAttribute('loading', img.getAttribute('loading') || 'lazy'); img.setAttribute('decoding', 'async'); if (img.dataset.src || img.dataset.srcset) hydrate(img); setIntrinsic(img); obs.unobserve(img); }); }, { rootMargin }); const ioBg = new IntersectionObserver((entries, obs) => { entries.forEach(e => { if (!e.isIntersecting) return; const el = e.target, bg = el.dataset.bg; if (bg) { el.style.backgroundImage = `url("${bg}")`; el.style.backgroundSize = el.style.backgroundSize || 'cover'; el.style.backgroundPosition = el.style.backgroundPosition || 'center'; el.style.backgroundRepeat = el.style.backgroundRepeat || 'no-repeat'; } obs.unobserve(el); }); }, { rootMargin }); const init = () => { const imgs = Array.from(document.images); const priority = imgs.find(i => i.hasAttribute('data-priority')) || imgs.filter(inViewport).sort((a, b) => areaInViewport(b) - areaInViewport(a))[0]; if (priority) { promote(priority); if (priority.dataset.src || priority.dataset.srcset) hydrate(priority); setIntrinsic(priority); } imgs.forEach(img => { if (img === priority) return; img.setAttribute('decoding', 'async'); if (img.dataset.src || img.dataset.srcset) ioImgs.observe(img); else if (!inViewport(img)) img.setAttribute('loading', 'lazy'), setIntrinsic(img); else setIntrinsic(img); }); document.querySelectorAll('[data-bg]').forEach(el => ioBg.observe(el)); }; document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init(); })();



(function () {
  /* ===== Premium Architectural Line Art (monoline, detailed) =====
     All strokes inherit color from CSS (currentColor) and use non-scaling-stroke.
     Stroke width slightly heavier for a “premium print” feel.
  */
  const ATTR = `fill="none" stroke="currentColor" stroke-width="1.4" 
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

  const ICONS = {
    /* Two-story facade with gable & garage suggestion */
    facade: `<svg width="120" height="120" viewBox="0 0 24 24" ${ATTR}>
      <path d="M3 12 L12 4 L21 12" />
      <rect x="5" y="12" width="14" height="8" rx="0.6"></rect>
      <rect x="8" y="14" width="3.2" height="2.8" rx="0.4"></rect>
      <rect x="12.8" y="14" width="3.2" height="2.8" rx="0.4"></rect>
      <rect x="11" y="16" width="2" height="4" rx="0.4"></rect>
      <circle cx="12.6" cy="18" r="0.35" fill="currentColor"></circle>
      <!-- ridge + soffit lines -->
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="12" y1="4" x2="12" y2="6.2"></line>
    </svg>`,

    /* Kitchen: island/cabinet linework, sink & faucet, hob */
    kitchen: `<svg width="120" height="120" viewBox="0 0 24 24" ${ATTR}>
      <!-- top shelf / backsplash -->
      <rect x="4" y="6" width="16" height="2.6" rx="0.5"></rect>
      <!-- wall cabinets suggestion -->
      <rect x="4.8" y="6.6" width="3.6" height="1.4" rx="0.2"></rect>
      <rect x="9.2" y="6.6" width="3.6" height="1.4" rx="0.2"></rect>
      <rect x="13.6" y="6.6" width="3.6" height="1.4" rx="0.2"></rect>

      <!-- counter/island -->
      <rect x="4" y="11" width="16" height="7" rx="0.6"></rect>
      <!-- drawers -->
      <line x1="8.5" y1="11" x2="8.5" y2="18"></line>
      <line x1="15.5" y1="11" x2="15.5" y2="18"></line>
      <!-- handles -->
      <line x1="6.2" y1="13" x2="7.8" y2="13"></line>
      <line x1="6.2" y1="15.2" x2="7.8" y2="15.2"></line>
      <line x1="6.2" y1="17.4" x2="7.8" y2="17.4"></line>
      <line x1="16.2" y1="13" x2="17.8" y2="13"></line>
      <line x1="16.2" y1="15.2" x2="17.8" y2="15.2"></line>
      <line x1="16.2" y1="17.4" x2="17.8" y2="17.4"></line>

      <!-- sink & faucet on counter -->
      <rect x="10.1" y="9" width="3.4" height="1.4" rx="0.3"></rect>
      <path d="M12 8.2c1 0 1.4.3 1.6 1.1"></path>
      <path d="M11.2 8.7c0-.6.3-1 .8-1"></path>

      <!-- hob suggestion -->
      <circle cx="6.5" cy="9.7" r="0.7"></circle>
      <circle cx="8.4" cy="9.7" r="0.5"></circle>
    </svg>`,

    /* Bathroom: vanity + mirror + faucet */
    bathroom: `<svg width="120" height="120" viewBox="0 0 24 24" ${ATTR}>
      <!-- mirror -->
      <rect x="8" y="3.8" width="8" height="5.8" rx="0.8"></rect>
      <line x1="9" y1="5.1" x2="12.2" y2="5.1"></line>
      <line x1="9" y1="6.7" x2="10.8" y2="6.7"></line>

      <!-- vanity -->
      <rect x="5" y="12.2" width="14" height="6.5" rx="0.6"></rect>
      <line x1="9.5" y1="12.2" x2="9.5" y2="18.7"></line>
      <line x1="14.5" y1="12.2" x2="14.5" y2="18.7"></line>
      <!-- pulls -->
      <line x1="6.6" y1="14.2" x2="8.2" y2="14.2"></line>
      <line x1="6.6" y1="16.6" x2="8.2" y2="16.6"></line>
      <line x1="11.6" y1="14.2" x2="13.2" y2="14.2"></line>
      <line x1="11.6" y1="16.6" x2="13.2" y2="16.6"></line>

      <!-- faucet/sink -->
      <rect x="7.4" y="10.3" width="3.6" height="1.2" rx="0.3"></rect>
      <path d="M9.2 9.8c1 0 1.5.3 1.7 1"></path>
      <path d="M8.6 10.3c0-.6.3-1 .9-1"></path>
    </svg>`,

    /* Stair + railing (architectural) */
    stair: `<svg width="120" height="120" viewBox="0 0 24 24" ${ATTR}>
      <!-- stringer -->
      <path d="M4 18 L12.2 9.8 L20 9.8"></path>
      <!-- treads -->
      <line x1="6.2" y1="15.8" x2="11.1" y2="15.8"></line>
      <line x1="8.4" y1="13.6" x2="13.0" y2="13.6"></line>
      <line x1="10.3" y1="11.7" x2="15.0" y2="11.7"></line>
      <!-- handrail -->
      <path d="M4.8 8.8 L13.5 8.8 L18.6 6.8"></path>
      <!-- posts -->
      <line x1="6.6" y1="9" x2="6.6" y2="15.8"></line>
      <line x1="8.9" y1="9" x2="8.9" y2="13.6"></line>
      <line x1="11.1" y1="9" x2="11.1" y2="11.7"></line>
    </svg>`,

    /* Window set with mullions & trim */
    windowset: `<svg width="120" height="120" viewBox="0 0 24 24" ${ATTR}>
      <rect x="4" y="6" width="16" height="12" rx="0.8"></rect>
      <line x1="12" y1="6" x2="12" y2="18"></line>
      <line x1="4" y1="12" x2="20" y2="12"></line>
      <!-- sill & header trim -->
      <line x1="3.2" y1="5.2" x2="20.8" y2="5.2"></line>
      <line x1="3.2" y1="18.8" x2="20.8" y2="18.8"></line>
    </svg>`
  };

  /* Place fewer/larger figures for a calmer, premium feel.
     Tweak x/y (vw/vh) to frame whitespace in your sections. */
  const FIGURES = [
    { icon: 'facade', x: 18, y: 30, scale: 1.00, rotate: -2 },
    { icon: 'windowset', x: 80, y: 26, scale: 0.98, rotate: 4 },
    { icon: 'kitchen', x: 60, y: 74, scale: 1.06, rotate: 0 },
    { icon: 'stair', x: 14, y: 66, scale: 1.08, rotate: -8 },
    { icon: 'bathroom', x: 76, y: 71, scale: 1.02, rotate: 3 }
  ];

  function mountPremiumFigures() {
    const holder = document.getElementById('universal-bg-figures');
    if (!holder) return;

    holder.innerHTML = '';
    FIGURES.forEach((f, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'figure';
      wrap.style.left = f.x + 'vw';
      wrap.style.top = f.y + 'vh';
      wrap.style.transform = `translate(-50%, -50%) scale(${f.scale}) rotate(${f.rotate}deg)`;
      wrap.style.transitionDelay = (i * 90) + 'ms';
      wrap.innerHTML = ICONS[f.icon] || '';
      holder.appendChild(wrap);
      requestAnimationFrame(() => (wrap.style.opacity = '1'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPremiumFigures, { once: true });
  } else {
    mountPremiumFigures();
  }
})();
