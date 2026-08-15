const resetForm = document.getElementById("resetForm");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const saveBtn = document.getElementById("saveBtn");

// Get token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (!token) {
    alert("Invalid reset link.");
    window.location.href = "forgot.html";
}

resetForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Updating...";

    try {

        const response = await fetch("http://localhost:3000/api/auth/reset-password", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                token,
                password
            })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            alert(data.message || "Failed to reset password.");

            saveBtn.disabled = false;
            saveBtn.textContent = "Update Password";

            return;

        }

        alert("Password updated successfully!");

        window.location.href = "login.html";

    } catch (error) {

        console.error(error);

        alert("Cannot connect to the server.");

        saveBtn.disabled = false;
        saveBtn.textContent = "Update Password";

    }

});