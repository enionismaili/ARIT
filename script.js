// Sticky shadow on scroll
window.addEventListener("scroll", function () {
  const header = document.querySelector("header");
  if (window.scrollY > 10) {
    header.classList.add("sticky-shadow");
  } else {
    header.classList.remove("sticky-shadow");
  }
});

// Hamburger menu toggle
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }
});
