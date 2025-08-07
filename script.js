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
