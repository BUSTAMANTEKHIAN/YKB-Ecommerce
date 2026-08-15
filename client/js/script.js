const bar = document.getElementById("bar");
const close = document.getElementById("close");
const navbar = document.getElementById("navbar");

// Open menu
if (bar) {
  bar.addEventListener("click", () => {
    navbar.classList.add("active");
    document.body.style.overflow = "hidden";
  });
}

// Close menu
if (close) {
  close.addEventListener("click", (e) => {
    e.preventDefault();
    navbar.classList.remove("active");
    document.body.style.overflow = "auto";
  });
}

// Close when any menu link is clicked
document.querySelectorAll("#navbar a").forEach(link => {

  link.addEventListener("click", (e) => {

    // Keep dropdown links working
    if (link.closest("#user-dropdown")) {
      return;
    }

    // Keep user button from closing the menu
    if (link.id === "user-btn") {
      e.preventDefault();
      return;
    }

    navbar.classList.remove("active");
    document.body.style.overflow = "auto";

  });

});

const sections = document.querySelectorAll("section:not(#header)");

// Show animation on page load (staggered)
window.addEventListener("load", () => {
  sections.forEach((section, index) => {
    setTimeout(() => {
      section.classList.add("show");
    }, index * 150);
  });
});

// Keep scroll animation for sections not yet revealed
window.addEventListener("scroll", () => {
  sections.forEach(section => {
    const top = section.getBoundingClientRect().top;
    if (top < window.innerHeight - 120) {
      section.classList.add("show");
    }
  });
});

// NOTE: previously there was a second DOMContentLoaded handler here that
// force-added "show" to every <section> (including #header) immediately on
// page load. That defeated the staggered fade-in/scroll-reveal animation
// above, since everything appeared instantly instead of animating in. It
// has been removed.

function getCartKey() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  return user ? `cart_${user.email}` : "cart_guest";
}

function updateCartCount() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;

  const cart = JSON.parse(localStorage.getItem(getCartKey())) || [];
  const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  badge.textContent = totalItems;
  badge.style.display = totalItems > 0 ? "flex" : "none";
}

function getWishlistKey() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  return user ? `wishlist_${user.email}` : "wishlist_guest";
}

function updateWishlistCount() {
  const badge = document.getElementById("wishlist-count");
  if (!badge) return;

  const wishlist = JSON.parse(localStorage.getItem(getWishlistKey())) || [];
  badge.textContent = wishlist.length;
  badge.style.display = wishlist.length > 0 ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  updateWishlistCount();

  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    console.log("Logged in as:", user.fullname);
  }
});

const userBtn = document.getElementById("user-btn");
const userDropdown = document.getElementById("user-dropdown");

if (userBtn) {
  userBtn.addEventListener("click", function (e) {
    e.preventDefault();
    userDropdown.classList.toggle("active");
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".user-menu")) {
      userDropdown.classList.remove("active");
    }
  });
}

const darkBtn = document.getElementById("dark-mode-btn");

// Apply saved mode on every page
if (localStorage.getItem("darkMode") === "on") {
  document.body.classList.add("dark-mode");
}

// Only run button code if the button exists
if (darkBtn) {
  darkBtn.innerHTML = document.body.classList.contains("dark-mode")
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';

  darkBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("darkMode", "on");
      darkBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      localStorage.setItem("darkMode", "off");
      darkBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
  });
}