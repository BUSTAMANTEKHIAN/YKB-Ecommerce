const forgotForm = document.getElementById("forgotForm");
const emailInput = document.getElementById("email");
const resetBtn = document.getElementById("resetBtn");
const devLinkBox = document.getElementById("email-dev-link");
const devLinkUrl = document.getElementById("email-dev-url");

function showToast(message, type = "success") {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type === "error" ? "error" : "success"}`;
    toast.textContent = message;
    stack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("animationend", () => toast.remove());
    }, 3500);
}

forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showToast("Please enter your email address.", "error");
        emailInput.focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Please enter a valid email address.", "error");
        emailInput.focus();
        return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = "Sending...";
    if (devLinkBox) devLinkBox.style.display = "none";

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            showToast(data.message || "Failed to send reset link. Please try again.", "error");
            resetBtn.disabled = false;
            resetBtn.textContent = "Send Reset Link";
            return;
        }

        showToast(data.message || "If an account matches that email, reset instructions will be sent.", "success");

        // Display development link if running in local development mode
        if (data.resetLink && devLinkBox && devLinkUrl) {
            devLinkUrl.href = data.resetLink;
            devLinkUrl.textContent = data.resetLink;
            devLinkBox.style.display = "block";
        }

        resetBtn.disabled = false;
        resetBtn.textContent = "Send Reset Link";

    } catch (error) {
        console.error("Forgot password request failed:", error);
        showToast("Unable to reach the server. Please check your connection and try again.", "error");
        resetBtn.disabled = false;
        resetBtn.textContent = "Send Reset Link";
    }
});
