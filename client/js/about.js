// about.js — page-specific behavior for about.html
// Relies on script.js having loaded first (shared toast/utility layer).

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("newsletter-form");
  if (!form) return;

  const emailInput = document.getElementById("newsletter-email");
  const errorEl = document.getElementById("newsletter-error");
  const submitBtn = document.getElementById("newsletter-submit");

  function showFieldError(message) {
    errorEl.textContent = message;
    errorEl.classList.add("show");
    emailInput.classList.add("invalid");
    emailInput.setAttribute("aria-invalid", "true");
  }

  function clearFieldError() {
    errorEl.textContent = "";
    errorEl.classList.remove("show");
    emailInput.classList.remove("invalid");
    emailInput.removeAttribute("aria-invalid");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  emailInput.addEventListener("input", () => {
    if (emailInput.value.trim() === "" || isValidEmail(emailInput.value.trim())) {
      clearFieldError();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const value = emailInput.value.trim();

    if (value === "") {
      showFieldError("Enter your email address.");
      emailInput.focus();
      return;
    }

    if (!isValidEmail(value)) {
      showFieldError("Enter a valid email address.");
      emailInput.focus();
      return;
    }

    clearFieldError();
    submitBtn.disabled = true;
    const label = submitBtn.querySelector(".btn-label");
    const originalLabel = label.textContent;
    label.textContent = "Signing up...";

    try {
      // Wire this to your real newsletter endpoint when it exists.
      // Simulated network delay so the busy state is visible in the meantime.
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (typeof showToast === "function") {
        showToast("You're on the list — welcome to YKB.", "success");
      } else {
        console.log("Subscribed:", value);
      }

      form.reset();
    } catch (err) {
      if (typeof showToast === "function") {
        showToast("Something went wrong. Try again in a moment.", "error");
      }
    } finally {
      submitBtn.disabled = false;
      label.textContent = originalLabel;
    }
  });
});