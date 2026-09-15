// =========================================================
// TOAST SYSTEM (replaces alert() across the site)
// Built from your documented spec: stacked, #toast-stack.
// If your other pages already ship a matching toast.js,
// drop that one in instead so every page stays identical.
// =========================================================

function showToast(message, type = "info", duration = 3200) {
  const stack = document.getElementById("toast-stack");
  if (!stack) {
    // Fallback so nothing silently fails if a page is missing the container
    console.warn("No #toast-stack found, falling back to alert:", message);
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;

  stack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

// =========================================================
// MOBILE NAVBAR
// Note: dark mode is handled entirely by darkmode.js (its own file,
// loaded separately). Nothing in this file touches .dark-mode — keep
// it that way so there's only ever one toggle listener running.
// =========================================================

const bar = document.getElementById("bar");
const close = document.getElementById("close");
const navbar = document.getElementById("navbar");
const navOverlay = document.getElementById("nav-overlay");

function openMobileNav() {
  if (!navbar) return;
  navbar.classList.add("active");
  if (navOverlay) navOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
  if (bar) bar.setAttribute("aria-expanded", "true");
}

function closeMobileNav() {
  if (!navbar) return;
  navbar.classList.remove("active");
  if (navOverlay) navOverlay.classList.remove("active");
  document.body.style.overflow = "";
  if (bar) bar.setAttribute("aria-expanded", "false");
}

if (bar && navbar) {
  bar.addEventListener("click", (e) => {
    e.preventDefault();
    openMobileNav();
  });
}

if (close && navbar) {
  close.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileNav();
  });
}

// Tapping the dim backdrop closes the menu
if (navOverlay) {
  navOverlay.addEventListener("click", closeMobileNav);
}

// Escape key closes the menu
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && navbar && navbar.classList.contains("active")) {
    closeMobileNav();
  }
});

// Close the mobile menu when a real nav link is clicked — but not the
// account button or its dropdown links, which need to stay usable
document.querySelectorAll("#navbar a").forEach((link) => {
  link.addEventListener("click", (e) => {
    if (link.id === "user-btn") {
      e.preventDefault();
      return;
    }
    if (link.closest("#user-dropdown")) {
      return;
    }
    closeMobileNav();
  });
});

// If the viewport is resized past the mobile breakpoint while the
// menu is open, close it so it doesn't get stuck mid-transition
window.addEventListener("resize", () => {
  if (window.innerWidth > 799 && navbar && navbar.classList.contains("active")) {
    closeMobileNav();
  }
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

// =========================================================
// DATABASE CART COUNT
// =========================================================

async function updateCartCount() {

    const badge = document.getElementById("cart-count");

    if (!badge) return;


    let user = null;

    try {

        user = JSON.parse(
            localStorage.getItem("currentUser")
        );

    } catch (error) {

        user = null;

    }


    // =========================================
    // GUEST USER
    // =========================================

    if (!user || !user.id) {

        badge.textContent = "0";
        badge.classList.remove("show");

        return;

    }


    // =========================================
    // GET CART FROM DATABASE
    // =========================================

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/cart/${user.id}`
        );


        if (!response.ok) {

            throw new Error(
                `Cart request failed: ${response.status}`
            );

        }


        const data = await response.json();


        const items = data.items || [];


        // Add all quantities together
        const totalItems = items.reduce(
            (total, item) => {

                return total +
                    (Number(item.quantity) || 0);

            },
            0
        );


        // Update navbar badge
        badge.textContent = totalItems;


        badge.classList.toggle(
            "show",
            totalItems > 0
        );


    } catch (error) {

        console.error(
            "Failed to update cart count:",
            error
        );


        badge.textContent = "0";

        badge.classList.remove("show");

    }

}

// =========================================================
// DATABASE WISHLIST COUNT
// =========================================================

async function updateWishlistCount() {

    const badge = document.getElementById("wishlist-count");

    if (!badge) return;

    let user = null;

    try {

        user = JSON.parse(
            localStorage.getItem("currentUser")
        );

    } catch (error) {

        user = null;

    }

    // =========================================
    // GUEST USER
    // =========================================

    if (!user || !user.id) {

        badge.textContent = "0";
        badge.classList.remove("show");

        return;

    }

    // =========================================
    // GET WISHLIST FROM DATABASE
    // =========================================

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/wishlist/${user.id}`
        );

        if (!response.ok) {

            throw new Error(
                `Wishlist request failed: ${response.status}`
            );

        }

        const wishlist = await response.json();

        // =========================================
        // UPDATE NAVBAR BADGE
        // =========================================

        const totalItems = Array.isArray(wishlist)
            ? wishlist.length
            : 0;

        badge.textContent = totalItems;

        badge.classList.toggle(
            "show",
            totalItems > 0
        );

    } catch (error) {

        console.error(
            "Failed to update wishlist count:",
            error
        );

        badge.textContent = "0";

        badge.classList.remove("show");

    }
}

// -----------------------------------------------------------------------
// AUTH NAV STATE
// -----------------------------------------------------------------------
// Every page's <header> markup has two sibling blocks:
//   #guest-links  -> Login / Register links (visible by default)
//   #user-menu    -> account dropdown, has class="hidden" by default
// This function toggles between them on load. It lives here in script.js
// so every page that includes this file gets it automatically — no
// separate auth.js needed (and if one exists elsewhere, remove it: two
// toggles running at once is the same "cancel each other out" bug that
// broke dark mode before).
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

// =========================================================
// USER ACCOUNT DROPDOWN
// =========================================================

const userBtn = document.getElementById("user-btn");
const userDropdown = document.getElementById("user-dropdown");

if (userBtn && userDropdown) {

    userBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = userDropdown.classList.toggle("active");
        userBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", function (e) {
        if (!e.target.closest("#user-menu")) {
            userDropdown.classList.remove("active");
            userBtn.setAttribute("aria-expanded", "false");
        }
    });

}

// =========================================================
// SIGN UP BUTTONS + NEWSLETTER VALIDATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    const accountSignup =
        document.getElementById("account-signup");

    const newsletterForm =
        document.getElementById("newsletter-form");

    const newsletterInput =
        document.getElementById("newsletter-email");

    const newsletterError =
        document.getElementById("newsletter-error");

    const newsletterButton =
        document.getElementById("newsletter-button");


    function handleSignup(event) {

        event.preventDefault();

        let currentUser = null;

        try {
            currentUser = JSON.parse(
                localStorage.getItem("currentUser")
            );
        } catch (error) {
            currentUser = null;
        }


        // =========================================
        // USER IS ALREADY LOGGED IN
        // =========================================

        if (currentUser) {

            showToast("You're already signed up!", "info");

            return;
        }


        // =========================================
        // USER IS NOT LOGGED IN
        // =========================================

        window.location.href = "register.html";
    }


    // Footer My Account → Sign Up
    if (accountSignup) {
        accountSignup.addEventListener(
            "click",
            handleSignup
        );
    }


    // =========================================
    // NEWSLETTER — real inline validation +
    // duplicate-subscriber check via localStorage
    // =========================================

    if (newsletterForm && newsletterInput) {

        function setNewsletterError(message) {
            newsletterInput.classList.toggle("input-error", !!message);
            if (newsletterError) newsletterError.textContent = message || "";
        }

        newsletterInput.addEventListener("input", () => {
            setNewsletterError("");
        });

        newsletterForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const email = newsletterInput.value.trim();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email) {
                setNewsletterError("Enter your email address.");
                newsletterInput.focus();
                return;
            }

            if (!emailPattern.test(email)) {
                setNewsletterError("Enter a valid email address.");
                newsletterInput.focus();
                return;
            }

            let subscribers = [];
            try {
                subscribers = JSON.parse(localStorage.getItem("newsletter_subscribers")) || [];
            } catch (error) {
                subscribers = [];
            }

            if (subscribers.includes(email.toLowerCase())) {
                setNewsletterError("This email is already subscribed.");
                return;
            }

            setNewsletterError("");

            if (newsletterButton) {
                newsletterButton.classList.add("is-busy");
                newsletterButton.disabled = true;
            }

            // Simulate the async subscribe call
            setTimeout(() => {
                subscribers.push(email.toLowerCase());
                localStorage.setItem("newsletter_subscribers", JSON.stringify(subscribers));

                showToast("You're subscribed! Check your inbox.", "success");
                newsletterForm.reset();

                if (newsletterButton) {
                    newsletterButton.classList.remove("is-busy");
                    newsletterButton.disabled = false;
                }
            }, 500);
        });
    }

});