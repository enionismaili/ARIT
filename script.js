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

  // ===== Contact form & phone validation (guarded) =====
  const form = document.getElementById("contact-form");
  const phoneInput = document.getElementById("phone");
  const successMessage = document.getElementById("success-message");

  if (phoneInput) {
    const validAreaCodes = "202"; // keep your logic
    function validatePhone() {
      const raw = phoneInput.value.replace(/\D/g, "");
      const areaCode = raw.substring(0, 3);
      const isValid = validAreaCodes.includes(areaCode) && raw.length === 10;
      phoneInput.setCustomValidity(isValid ? "" : "Enter an existing phone number of Washington DC");
      phoneInput.reportValidity();
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
