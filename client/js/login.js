const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        // Loading state
        loginBtn.disabled = true;
        loginBtn.textContent = "Signing in...";

        try {

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })

            });

            const data = await response.json();

            if (!response.ok || !data.success) {

                alert(data.message || "Login failed.");

                loginBtn.disabled = false;
                loginBtn.textContent = "Sign In";

                return;

            }

            // Save session
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            localStorage.setItem("token", data.token);

            // Small delay for better UX
            loginBtn.textContent = "Success!";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 700);

        } catch (error) {

            console.error(error);

            alert("Cannot connect to the server.");

            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";

        }

    });

}