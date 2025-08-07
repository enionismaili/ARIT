// Sticky shadow on scroll
window.addEventListener("scroll", function () {
  const header = document.querySelector("header");
  if (window.scrollY > 10) {
    header.classList.add("sticky-shadow");
  } else {
    header.classList.remove("sticky-shadow");
  }
});

// DOM Ready
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  const form = document.getElementById("contact-form");
  const successMessage = document.getElementById("success-message");

  // Hamburger menu toggle
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function (event) {
      event.stopPropagation();
      navLinks.classList.toggle("open");
    });

    // Close menu when clicking outside
    document.addEventListener("click", function (event) {
      const clickedInsideMenu = navLinks.contains(event.target);
      const clickedHamburger = hamburger.contains(event.target);

      if (!clickedInsideMenu && !clickedHamburger) {
        navLinks.classList.remove("open");
      }
    });

    // Close menu when clicking a link inside it
    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
      });
    });
  }

  // Contact form handling
  if (form && successMessage) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const formData = new FormData(form);

      fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      })
        .then((response) => {
          if (response.ok) {
            form.reset();
            successMessage.style.display = "block";
          } else {
            alert("❌ There was a problem submitting the form. Please try again.");
          }
        })
        .catch(() => {
          alert("⚠️ Network error. Please try again later.");
        });
    });
  }
});


// Highlight active nav link
const currentPath = window.location.pathname.split("/").pop(); // e.g., 'about.html'

document.querySelectorAll(".nav-links a").forEach(link => {
  const linkPath = link.getAttribute("href");
  if (linkPath === currentPath || (linkPath === "index.html" && currentPath === "")) {
    link.classList.add("active");
  }
});


const track = document.getElementById("carouselTrack");
const cards = document.querySelectorAll(".review-card");
const container = document.querySelector(".carousel-container");

let index = 0;
let interval;

// Determine visible cards based on screen width
function getVisibleCardsCount() {
  if (window.innerWidth <= 600) return 1;
  if (window.innerWidth <= 991) return 2;
  return 3;
}

// Clone visible cards for seamless loop
const visibleCount = getVisibleCardsCount();
for (let i = 0; i < visibleCount; i++) {
  const clone = cards[i].cloneNode(true);
  track.appendChild(clone);
}

function getCardFullWidth() {
  const card = track.querySelector(".review-card");
  const style = window.getComputedStyle(card);
  const width = card.offsetWidth;
  const gap = parseFloat(style.marginRight) || 24; // fallback
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
      setTimeout(() => {
        track.style.transition = "transform 0.5s ease-in-out";
      }, 20);
    }, 500);
  }
}

function startAutoSlide() {
  interval = setInterval(slideCarousel, 3000);
}

function stopAutoSlide() {
  clearInterval(interval);
}

// Start
startAutoSlide();

// Pause on hover
container.addEventListener("mouseenter", stopAutoSlide);
container.addEventListener("mouseleave", startAutoSlide);

// Optional: reset on window resize
window.addEventListener("resize", () => {
  stopAutoSlide();
  index = 0;
  track.style.transition = "none";
  track.style.transform = `translateX(0px)`;
  setTimeout(() => {
    track.style.transition = "transform 0.5s ease-in-out";
  }, 20);
  startAutoSlide();
});