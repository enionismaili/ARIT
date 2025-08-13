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


const validAreaCodes = "202";
// const validAreaCodes = [
//   "201", "202", "203", "205", "206", "207", "208", "209", "210", "212", "213", "214", "215", "216", "217", "218", "219", "220",
//   "223", "224", "225", "228", "229", "231", "234", "239", "240", "248", "251", "252", "253", "254", "256", "260", "262", "267",
//   "269", "270", "272", "274", "276", "279", "281", "283", "301", "302", "303", "304", "305", "307", "308", "309", "310", "312",
//   "313", "314", "315", "316", "317", "318", "319", "320", "321", "323", "325", "327", "330", "331", "334", "336", "337", "339",
//   "341", "346", "347", "351", "352", "360", "361", "364", "380", "385", "386", "401", "402", "404", "405", "406", "407", "408",
//   "409", "410", "412", "413", "414", "415", "417", "419", "423", "424", "425", "430", "432", "434", "435", "440", "442", "443",
//   "447", "458", "463", "464", "469", "470", "475", "478", "479", "480", "484", "501", "502", "503", "504", "505", "507", "508",
//   "509", "510", "512", "513", "515", "516", "517", "518", "520", "530", "531", "534", "539", "540", "541", "551", "557", "559",
//   "561", "562", "563", "564", "567", "570", "571", "573", "574", "575", "580", "582", "585", "586", "601", "602", "603", "605",
//   "606", "607", "608", "609", "610", "612", "614", "615", "616", "617", "618", "619", "620", "623", "626", "628", "629", "630",
//   "631", "636", "641", "646", "650", "651", "657", "659", "660", "661", "662", "667", "669", "678", "680", "681", "682", "689",
//   "701", "702", "703", "704", "706", "707", "708", "712", "713", "714", "715", "716", "717", "718", "719", "720", "724", "725",
//   "726", "727", "730", "731", "732", "734", "737", "740", "743", "747", "754", "757", "760", "762", "763", "764", "765", "769",
//   "770", "771", "772", "773", "774", "775", "779", "781", "785", "786", "801", "802", "803", "804", "805", "806", "808", "810",
//   "812", "813", "814", "815", "816", "817", "818", "820", "825", "828", "830", "831", "832", "838", "839", "840", "843", "845",
//   "847", "848", "850", "854", "856", "857", "858", "859", "860", "862", "863", "864", "865", "870", "872", "878", "901", "903",
//   "904", "906", "907", "908", "909", "910", "912", "913", "914", "915", "916", "917", "918", "919", "920", "925", "928", "929",
//   "930", "931", "934", "936", "937", "938", "940", "941", "943", "945", "947", "948", "949", "951", "952", "954", "956", "959",
//   "970", "971", "972", "973", "978", "979", "980", "984", "985", "986", "989"
// ];

const phoneInput = document.getElementById("phone");

function validatePhone() {
  const raw = phoneInput.value.replace(/\D/g, ""); // remove non-digits
  const areaCode = raw.substring(0, 3);
  const isValid = validAreaCodes.includes(areaCode) && raw.length === 10;

  if (!isValid) {
    //phoneInput.setCustomValidity("Enter a valid U.S. phone number with a real area code");
    phoneInput.setCustomValidity("Enter a real phone number of Washington DC");
  } else {
    phoneInput.setCustomValidity("");
  }

  phoneInput.reportValidity();
}

phoneInput.addEventListener("blur", validatePhone);
phoneInput.addEventListener("input", validatePhone);

document.getElementById("contact-form").addEventListener("submit", function (e) {
  validatePhone();
  if (!phoneInput.checkValidity()) e.preventDefault();
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