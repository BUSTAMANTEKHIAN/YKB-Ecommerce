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

        const response = await fetch("http://localhost:3000/api/auth/forgot-password", {

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

        // Development: show the reset link
        alert(
            "Reset link generated!\\n\\n" +
            "For now, copy the link from the browser console or terminal.\\n\\n" +
            data.resetLink
        );

        resetBtn.disabled = false;
        resetBtn.textContent = "Send Reset Link";

    } catch (error) {

        console.error(error);

        alert("Cannot connect to the server.");

        resetBtn.disabled = false;
        resetBtn.textContent = "Send Reset Link";

    }

});