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

// -----------------------------------------------------------------------
// AUTH NAV STATE
// -----------------------------------------------------------------------
// Fixes: "Login/Register" showing in the navbar even when a user is
// already logged in. Every page's <header> markup has two sibling blocks:
//   #guest-links  -> Login / Register links (visible by default)
//   #user-menu    -> account dropdown, has class="hidden" by default
// Nothing was ever toggling between them on page load unless a page
// separately included an auth.js that did this. This function makes that
// toggle a guaranteed part of script.js, so it runs on every page that
// already includes this file — no extra script tag required.
//
// If you have a separate auth.js elsewhere ALSO toggling #guest-links /
// #user-menu on DOMContentLoaded, remove that duplicate logic — running
// both is the same "two toggles cancel each other out" bug that broke
// dark mode before.
// -----------------------------------------------------------------------
function updateAuthUI() {
  const guestLinks = document.getElementById("guest-links");
  const userMenu = document.getElementById("user-menu");
  const usernameEl = document.getElementById("nav-username");

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("currentUser"));
  } catch (err) {
    user = null;
  }

  if (user) {
    if (guestLinks) guestLinks.classList.add("hidden");
    if (userMenu) userMenu.classList.remove("hidden");
    if (usernameEl) usernameEl.textContent = user.fullname || user.name || user.email || "Account";
  } else {
    if (guestLinks) guestLinks.classList.remove("hidden");
    if (userMenu) userMenu.classList.add("hidden");
  }
}

function logout() {
  localStorage.removeItem("currentUser");
  updateAuthUI();
  updateCartCount();
  updateWishlistCount();
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  updateWishlistCount();
  updateAuthUI();
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
