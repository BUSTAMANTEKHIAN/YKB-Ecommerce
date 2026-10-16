const resetForm = document.getElementById("resetForm");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const saveBtn = document.getElementById("saveBtn");

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

// Get token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (!token || !token.trim()) {
    showToast("Invalid or missing reset token. Redirecting...", "error");
    setTimeout(() => {
        window.location.href = "forgot.html";
    }, 1500);
}

resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!token) {
        showToast("Invalid reset link. Please request a new one.", "error");
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        showToast("Password must be at least 8 characters and include a letter and a number.", "error");
        passwordInput.focus();
        return;
    }

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        confirmInput.focus();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Updating...";

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: token.trim(),
                password
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            showToast(data.message || "Failed to reset password. The link may have expired.", "error");
            saveBtn.disabled = false;
            saveBtn.textContent = "Update Password";
            return;
        }

        showToast("Password updated successfully! Redirecting to login...", "success");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);

    } catch (error) {
        console.error("Reset password request failed:", error);
        showToast("Unable to reach the server. Please check your connection and try again.", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "Update Password";
    }
});
