// Sticky shadow on scroll
window.addEventListener("scroll", function () {
  const header = document.querySelector("header");
  if (window.scrollY > 10) header.classList.add("sticky-shadow");
  else header.classList.remove("sticky-shadow");
});

(function () {
  const header = document.querySelector("header");
  if (!header) return;

  function setHeaderOffset() {
    const h = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--header-h", `${h}px`);
  }

  // initial + on resize
  window.addEventListener("load", setHeaderOffset);
  window.addEventListener("resize", setHeaderOffset);

  // in case fonts wrap the navbar later
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setHeaderOffset);
  }

  // react to header height changes (e.g., layout shifts)
  if (window.ResizeObserver) {
    new ResizeObserver(setHeaderOffset).observe(header);
  }

  // run once now
  setHeaderOffset();
})();


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

  function startAuto() { clearInterval(interval); interval = setInterval(slideNext, 5000); }
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



// (function () {
//   // Common stroke attributes
//   const ATTR = `fill="none" stroke="currentColor" stroke-width="1.35"
//   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
//   const SVG = (w, h, inner, vb = "0 0 240 240") =>
//     `<svg width="${w}" height="${h}" viewBox="${vb}" ${ATTR}><g vector-effect="non-scaling-stroke">${inner}</g></svg>`;

//   // ===== Realistic architectural drawings =====
//   const FIGS = {
//     // Cozy Family Home Silhouette (gable, porch, real windows)
//     cozyHome: SVG(190, 170, `
//   <path d="M36 124 L120 52 L204 124"></path>
//   <rect x="56" y="124" width="128" height="56" rx="3"></rect>
//   <rect x="72" y="138" width="20" height="18"></rect>
//   <rect x="98" y="138" width="20" height="18"></rect>
//   <rect x="148" y="138" width="24" height="24"></rect>
//   <rect x="114" y="132" width="18" height="48" rx="2"></rect>
//   <circle cx="127" cy="156" r="1.8" fill="currentColor"></circle>
//   <rect x="56" y="116" width="128" height="8"></rect> <!-- soffit band -->
//   `),

//     // Modern Two-Story Outline (clean volumes + glazing)
//     modernTwoStory: SVG(200, 170, `
//   <rect x="52" y="42" width="100" height="30" rx="2"></rect>
//   <rect x="52" y="72" width="136" height="70" rx="2"></rect>
//   <rect x="64" y="82" width="26" height="20"></rect>
//   <rect x="96" y="82" width="26" height="20"></rect>
//   <rect x="128" y="82" width="48" height="46"></rect>
//   <rect x="100" y="122" width="22" height="20"></rect>
//   <line x1="52" y1="142" x2="188" y2="142"></line>
//   `),

//     // Craftsman Facade (gable, tapered posts, paneled door)
//     craftsmanFacade: SVG(200, 170, `
//   <path d="M40 120 L120 62 L200 120"></path>
//   <rect x="52" y="120" width="136" height="56"></rect>
//   <rect x="68" y="120" width="22" height="56"></rect>
//   <rect x="150" y="120" width="22" height="56"></rect>
//   <rect x="108" y="140" width="26" height="36"></rect>
//   <line x1="108" y1="158" x2="134" y2="158"></line>
//   <rect x="88" y="132" width="14" height="18"></rect>
//   <rect x="140" y="132" width="14" height="18"></rect>
//   `),

//     // Classic Brick Ranch Elevation (running-bond hatch)
//     brickRanch: SVG(200, 150, `
//   <path d="M40 100 L120 64 L200 100"></path>
//   <rect x="40" y="100" width="160" height="44" rx="2"></rect>
//   ${[0, 1, 2, 3, 4].map(r => `<line x1="40" y1="${110 + r * 8}" x2="200" y2="${110 + r * 8}"></line>`).join('')}
//   ${[0, 1, 2, 3, 4].map(r => {
//       const y = 106 + r * 8, xs = r % 2 ? [60, 100, 140, 180] : [40, 80, 120, 160, 200];
//       return xs.map(x => `<line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}"></line>`).join('');
//     }).join('')}
//   <rect x="64" y="110" width="24" height="16"></rect>
//   <rect x="108" y="110" width="24" height="16"></rect>
//   <rect x="152" y="110" width="24" height="16"></rect>
//   <rect x="120" y="120" width="16" height="24"></rect>
//   `),

//     // Roof & Gable with shingles, ridge & chimney
//     roofGable: SVG(190, 150, `
//   <path d="M40 102 L120 44 L200 102"></path>
//   <line x1="40" y1="102" x2="200" y2="102"></line>
//   <rect x="134" y="56" width="16" height="18"></rect> <!-- chimney -->
//   ${[0, 1, 2, 3, 4].map(i => `<line x1="${52 + i * 28}" y1="90" x2="${72 + i * 28}" y2="90"></line>`).join('')}
//   <line x1="120" y1="44" x2="120" y2="58"></line>
//   `),

//     // Entry Door with Sidelights (realistic)
//     entryDoorSidelights: SVG(180, 170, `
//   <rect x="58" y="50" width="124" height="140" rx="3"></rect>
//   <rect x="66" y="60" width="18" height="120"></rect>
//   <rect x="156" y="60" width="18" height="120"></rect>
//   <rect x="96" y="66" width="48" height="102" rx="2"></rect>
//   <line x1="138" y1="118" x2="146" y2="118"></line>
//   <circle cx="135" cy="118" r="1.8" fill="currentColor"></circle>
//   `),

//     // Bay Window Profile (projection lines + mullions)
//     bayWindow: SVG(190, 160, `
//   <path d="M60 118 L92 92 L148 92 L180 118"></path>
//   <rect x="84" y="92" width="28" height="28"></rect>
//   <rect x="116" y="92" width="28" height="28"></rect>
//   <line x1="60" y1="118" x2="180" y2="118"></line>
//   <line x1="92" y1="92" x2="92" y2="122"></line>
//   <line x1="148" y1="92" x2="148" y2="122"></line>
//   `),

//     // Garage Door Panel Pattern
//     garageDoorPanels: SVG(190, 130, `
//   <rect x="50" y="62" width="140" height="54" rx="2"></rect>
//   ${[0, 1, 2, 3].map(i => `<rect x="${56 + i * 34}" y="68" width="28" height="18"></rect>`).join('')}
//   ${[0, 1, 2, 3].map(i => `<rect x="${56 + i * 34}" y="92" width="28" height="18"></rect>`).join('')}
//   `),

//     // Rain Gutter & Downspout
//     gutterDownspout: SVG(180, 150, `
//   <path d="M50 82 H190"></path>
//   <path d="M186 82 v56 h-18"></path>
//   <circle cx="176" cy="138" r="2" fill="currentColor"></circle>
//   <line x1="64" y1="88" x2="92" y2="88"></line>
//   <line x1="102" y1="88" x2="130" y2="88"></line>
//   `),

//     // Deck with Pergola Outline
//     deckPergola: SVG(190, 170, `
//   <rect x="50" y="122" width="140" height="12"></rect>
//   ${[0, 1, 2, 3, 4].map(i => `<rect x="${60 + i * 24}" y="72" width="6" height="50"></rect>`).join('')}
//   <line x1="50" y1="72" x2="190" y2="72"></line>
//   ${[0, 1, 2, 3, 4].map(i => `<line x1="${60 + i * 24}" y1="72" x2="${60 + i * 24}" y2="66"></line>`).join('')}
//   `),

//     // Backyard Patio Pavers (grid)
//     patioPavers: SVG(180, 150, `
//   <rect x="62" y="82" width="120" height="56"></rect>
//   ${[0, 1, 2, 3, 4].map(i => `<line x1="62" y1="${94 + i * 12}" x2="182" y2="${94 + i * 12}"></line>`).join('')}
//   ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${74 + i * 18}" y1="82" x2="${74 + i * 18}" y2="138"></line>`).join('')}
//   `),

//     // Garden Fence & Gate
//     fenceGate: SVG(190, 160, `
//   ${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${60 + i * 16}" y="72" width="6" height="70"></rect>`).join('')}
//   <rect x="60" y="72" width="112" height="70"></rect>
//   <line x1="116" y1="72" x2="116" y2="142"></line>
//   <circle cx="120" cy="110" r="2" fill="currentColor"></circle>
//   `),

//     // Plan Corner with Door Swing + Dimensions
//     planCorner: SVG(190, 170, `
//   <rect x="44" y="44" width="160" height="18"></rect>
//   <rect x="44" y="44" width="18" height="160"></rect>
//   <rect x="44" y="122" width="18" height="60" fill="none"></rect>
//   <path d="M62 122 A60 60 0 0 1 122 182"></path>
//   <line x1="44" y1="34" x2="204" y2="34"></line>
//   <line x1="44" y1="34" x2="44" y2="30"></line><line x1="204" y1="34" x2="204" y2="30"></line>
//   <line x1="34" y1="44" x2="34" y2="204"></line>
//   <line x1="34" y1="44" x2="30" y2="44"></line><line x1="34" y1="204" x2="30" y2="204"></line>
//   <path stroke-dasharray="4 4" d="M124 44 V204"></path>
//   `),

//     // Wall Section Cutaway (studs, drywall, sheathing, insulation)
//     wallSection: SVG(200, 180, `
//   <rect x="54" y="38" width="10" height="146"></rect>
//   ${[0, 1, 2, 3].map(i => `<rect x="${78 + i * 32}" y="38" width="10" height="146"></rect>`).join('')}
//   <rect x="54" y="38" width="136" height="12"></rect>
//   <rect x="54" y="172" width="136" height="12"></rect>
//   <rect x="40" y="38" width="14" height="146"></rect>     <!-- drywall -->
//   <rect x="190" y="38" width="10" height="146"></rect>    <!-- sheathing -->
//   ${[0, 1, 2, 3, 4].map(r => `<path d="M70 ${58 + r * 28} q10 6 20 0 t20 0 t20 0 t20 0"></path>`).join('')}
//   <line x1="30" y1="184" x2="210" y2="184"></line>
//   `),

//     // Staircase & Handrail (treads, risers, rail)
//     stair: SVG(190, 160, `
//   <path d="M46 136 L112 72 L186 72"></path>
//   <line x1="64" y1="120" x2="112" y2="120"></line>
//   <line x1="82" y1="104" x2="130" y2="104"></line>
//   <line x1="100" y1="88" x2="148" y2="88"></line>
//   <path d="M48 70 L114 70 L166 54"></path> <!-- handrail -->
//   `),

//     // Kitchen Island & Cabinets (elevation)
//     kitchen: SVG(190, 170, `
//   <rect x="56" y="66" width="128" height="70" rx="4"></rect> <!-- base run -->
//   <rect x="68" y="78" width="36" height="18"></rect>         <!-- sink -->
//   <rect x="110" y="78" width="24" height="12"></rect>
//   <rect x="140" y="78" width="24" height="12"></rect>
//   <rect x="92" y="102" width="32" height="26"></rect>        <!-- drawers -->
//   `),

//     // Bathroom Vanity & Tiling
//     bathroom: SVG(180, 170, `
//   <rect x="60" y="60" width="120" height="28" rx="4"></rect>
//   <rect x="52" y="104" width="136" height="42" rx="3"></rect>
//   <line x1="120" y1="104" x2="120" y2="146"></line>
//   <line x1="68" y1="118" x2="84" y2="118"></line>
//   <line x1="156" y1="118" x2="172" y2="118"></line>
//   ${[0, 1, 2, 3].map(r => `<line x1="60" y1="${92 + r * 6}" x2="180" y2="${92 + r * 6}"></line>`).join('')}
//   `)
//   };

//   // Pool of realistic drawings
//   const POOL = [
//     'cozyHome', 'modernTwoStory', 'craftsmanFacade', 'brickRanch',
//     'roofGable', 'entryDoorSidelights', 'bayWindow', 'garageDoorPanels',
//     'gutterDownspout', 'deckPergola', 'patioPavers', 'fenceGate',
//     'planCorner', 'wallSection', 'stair', 'kitchen', 'bathroom'
//   ];

//   // ---------- Random placement (avoids center & overlaps) ----------
//   const rand = (a, b) => Math.random() * (b - a) + a;
//   const pickSideX = () => (Math.random() < 0.5 ? rand(10, 36) : rand(64, 90)); // keep center cleaner
//   const headerVH = () => {
//     const h = document.querySelector('header'); if (!h) return 0;
//     return (h.getBoundingClientRect().height / Math.max(1, innerHeight)) * 100;
//   };
//   function placeNonOverlap(n, margin = 8) {
//     const pts = [], minDist = 18; let guard = 0;
//     while (pts.length < n && guard < 800) {
//       guard++;
//       const x = pickSideX();
//       const y = rand(margin + headerVH(), 100 - margin - 6);
//       if (pts.every(p => Math.hypot((x - p.x) * 0.8, y - p.y) > minDist)) pts.push({ x, y });
//     }
//     return pts;
//   }

//   function mount() {
//     const holder = document.getElementById('universal-bg-figures'); if (!holder) return;
//     holder.innerHTML = '';

//     const count = innerWidth < 520 ? 5 : innerWidth < 1024 ? 7 : 9;
//     const names = [...POOL].sort(() => Math.random() - 0.5).slice(0, count);
//     const spots = placeNonOverlap(names.length, 10);

//     names.forEach((key, i) => {
//       const wrap = document.createElement('div');
//       wrap.className = 'figure';
//       const pos = spots[i] || { x: pickSideX(), y: rand(18, 86) };
//       const scale = rand(0.94, 1.12);
//       const rot = rand(-8, 8);
//       wrap.style.left = pos.x + 'vw';
//       wrap.style.top = pos.y + 'vh';
//       wrap.style.transform = `translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`;
//       wrap.style.transitionDelay = (i * 80) + 'ms';
//       wrap.innerHTML = FIGS[key];
//       holder.appendChild(wrap);
//       requestAnimationFrame(() => wrap.style.opacity = '1');
//     });

//     // quick manual reshuffle for you: run ARIT_BG_randomize() in console
//     window.ARIT_BG_randomize = mount;
//   }

//   if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
//   else mount();

//   let R; addEventListener('resize', () => { clearTimeout(R); R = setTimeout(mount, 180); });
// })();
