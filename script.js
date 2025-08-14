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
  let interval, index = 0;

  if (track && container) {
    const cards = Array.from(track.querySelectorAll(".review-card"));
    function getVisibleCardsCount() {
      if (window.innerWidth <= 600) return 1;
      if (window.innerWidth <= 991) return 2;
      return 3;
    }
    const visibleCount = Math.min(getVisibleCardsCount(), cards.length);
    for (let i = 0; i < visibleCount; i++) {
      track.appendChild(cards[i].cloneNode(true));
    }
    function getCardFullWidth() {
      const card = track.querySelector(".review-card");
      const style = window.getComputedStyle(card);
      const width = card.offsetWidth;
      const gap = parseFloat(style.marginRight) || 24;
      return width + gap;
    }
    function slideCarousel() {
      index++;
      const cardWidth = getCardFullWidth();
      track.style.transform = `translateX(-${index * cardWidth}px)`;
      if (index >= cards.length) {
        setTimeout(() => {
          track.style.transition = "none";
          track.style.transform = `translateX(0px)`;
          index = 0;
          setTimeout(() => { track.style.transition = "transform 0.5s ease-in-out"; }, 20);
        }, 500);
      }
    }
    function startAutoSlide() { interval = setInterval(slideCarousel, 3000); }
    function stopAutoSlide() { clearInterval(interval); }
    startAutoSlide();
    container.addEventListener("mouseenter", stopAutoSlide);
    container.addEventListener("mouseleave", startAutoSlide);
    window.addEventListener("resize", () => {
      stopAutoSlide(); index = 0;
      track.style.transition = "none";
      track.style.transform = `translateX(0px)`;
      setTimeout(() => { track.style.transition = "transform 0.5s ease-in-out"; }, 20);
      startAutoSlide();
    });
  }
});




/* === Paint-Reveal Intro (global) === */
(function () {
  'use strict';

  // Don’t run if user prefers reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Create overlay elements on any page (no HTML changes needed)
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

  // Insert at end of <body>
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

    // Dark/Light alternating texture that “spins”
    function headPattern(headH, offset, dark, light) {
      const stripeW = Math.max(16, Math.round(headH * 0.35)); // thick
      const patW = stripeW * 2;
      const patH = Math.max(8, Math.round(headH * 0.65));
      const cv = document.createElement('canvas');
      cv.width = patW; cv.height = patH;
      const c2 = cv.getContext('2d');

      // base (light)
      c2.fillStyle = light; c2.fillRect(0, 0, patW, patH);

      // moving dark stripe
      const x = ((Math.round(offset) % patW) + patW) % patW;
      c2.fillStyle = dark; c2.fillRect(x, 0, stripeW, patH);

      // subtle cylindrical highlight/shadow
      const g = c2.createLinearGradient(0, 0, 0, patH);
      g.addColorStop(0.00, 'rgba(255,255,255,0.25)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.00)');
      g.addColorStop(1.00, 'rgba(0,0,0,0.10)');
      c2.fillStyle = g; c2.fillRect(0, 0, patW, patH);

      return ctx.createPattern(cv, 'repeat');
    }

    function build() {
      setCanvasSize();
      const count = decideCount(W);
      veilHost.innerHTML = ''; rollers.length = 0;

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

        // COVER column (starts opaque white)
        const clip = document.createElement('div');
        clip.className = 'cover-clip';
        clip.style.left = segX + 'px';
        clip.style.width = segW + 'px';
        clip.style.setProperty('--revealY', '0px');

        const pane = document.createElement('div');
        pane.className = 'cover-pane';
        clip.appendChild(pane);
        veilHost.appendChild(clip);

        rollers.push({
          segX, segW,
          headX, headY: 0, headW, headH, headR: Math.min(18, Math.round(headH / 3)),
          armLen, handleW, handleH,
          y: -headH - 24,
          pane, clip
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
      ctx.fillStyle = '#ffc72c'; ctx.beginPath(); ctx.arc(rightX - 8, armY, 2.6, 0, Math.PI * 2); ctx.fill();

      // handle
      const hx = rightX + armLen - Math.round(handleW / 2);
      const hy = handleTop;
      roundedRect(ctx, hx, hy, handleW, handleH, 8); ctx.fillStyle = COL.handle; ctx.fill();
      roundedRect(ctx, hx + 4, hy + 4, handleW - 8, handleH - 8, 6); ctx.fillStyle = COL.handleIn; ctx.fill();

      // subtle head shadow
      ctx.shadowColor = COL.shadow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'transparent'; roundedRect(ctx, headX, headY, headW, headH, headR); ctx.fill();

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

        rollers.forEach(r => {
          const over = Math.max(24, r.headH);
          r.y = -r.headH - 24 + eased * (H + over);

          // hardware
          const circumference = Math.max(60, r.headH * Math.PI);
          const spinOffset = (eased * circumference) % (r.headH * 0.36 + 12);
          drawRoller(r, spinOffset);

          // reveal (slightly behind the head)
          const revealY = Math.max(0, Math.min(H, r.y + r.headH * 0.6));
          r.clip.style.setProperty('--revealY', revealY + 'px');
        });

        if (t < 1) {
          requestAnimationFrame(loop);
        } else {
          rollers.forEach(r => r.clip.style.setProperty('--revealY', H + 'px'));
          overlay.classList.add('fade-out');
          overlay.addEventListener('animationend', () => overlay.setAttribute('hidden', ''), { once: true });
        }
      };

      requestAnimationFrame(loop);
    }

    function rebuildAndRestart() { build(); animate(); }
    function init() { build(); animate(); }

    // Size + init
    const ro = new ResizeObserver(() => { setCanvasSize(); rebuildAndRestart(); });
    ro.observe(document.documentElement);

    // Initial
    setCanvasSize(); init();
  }

})();
