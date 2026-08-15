const registerForm = document.getElementById("registerForm");

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const registerBtn = document.getElementById("registerBtn");

// Clear fields
usernameInput.value = "";
emailInput.value = "";
passwordInput.value = "";
confirmInput.value = "";

registerForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const fullname = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    // Validation
    if (!fullname || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    // Loading state
    registerBtn.disabled = true;
    registerBtn.textContent = "Creating account...";

    try {

        const response = await fetch("http://localhost:3000/api/auth/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                fullname,
                email,
                password
            })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            alert(data.message || "Registration failed.");

            registerBtn.disabled = false;
            registerBtn.textContent = "Create Account";

            return;

        }

        registerBtn.textContent = "Account Created!";

        setTimeout(() => {

            window.location.href = "login.html";

        }, 800);

    } catch (error) {

        console.error(error);

        alert("Cannot connect to the server.");

        registerBtn.disabled = false;
        registerBtn.textContent = "Create Account";

    }

});