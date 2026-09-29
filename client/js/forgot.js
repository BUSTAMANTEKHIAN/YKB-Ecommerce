const forgotForm = document.getElementById("forgotForm");
const emailInput = document.getElementById("email");
const resetBtn = document.getElementById("resetBtn");

forgotForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = "Sending...";

    try {

        const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({ email })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            alert(data.message || "Failed to send reset link.");

            resetBtn.disabled = false;
            resetBtn.textContent = "Send Reset Link";

            return;

        }

        alert(data.resetLink ? `Development reset link:\n${data.resetLink}` : (data.message || "If an account matches that email, reset instructions will be sent."));

        resetBtn.disabled = false;
        resetBtn.textContent = "Send Reset Link";

    } catch (error) {

        console.error(error);

        alert("Cannot connect to the server.");

        resetBtn.disabled = false;
        resetBtn.textContent = "Send Reset Link";

    }

});
