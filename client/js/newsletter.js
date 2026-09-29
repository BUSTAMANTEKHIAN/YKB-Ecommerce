document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".site-newsletter-form").forEach(form => {
        const input = form.querySelector('input[type="email"]');
        const error = form.querySelector(".field-error");
        const button = form.querySelector('button[type="submit"]');
        const label = button?.querySelector(".btn-label");
        if (!input || !button) return;

        form.addEventListener("submit", event => {
            event.preventDefault();
            const email = input.value.trim().toLowerCase();
            if (!input.checkValidity()) {
                if (error) error.textContent = "Enter a valid email address.";
                input.focus();
                return;
            }
            let subscribers = [];
            try { subscribers = JSON.parse(localStorage.getItem("newsletter_subscribers")) || []; }
            catch { subscribers = []; }
            if (subscribers.includes(email)) {
                if (error) error.textContent = "This email is already signed up.";
                return;
            }
            subscribers.push(email);
            localStorage.setItem("newsletter_subscribers", JSON.stringify(subscribers));
            form.reset();
            if (error) error.textContent = "Thanks for signing up!";
            if (label) label.textContent = "Signed Up";
            button.disabled = true;
            window.setTimeout(() => {
                button.disabled = false;
                if (label) label.textContent = "Sign Up";
                if (error) error.textContent = "";
            }, 2200);
        });

        input.addEventListener("input", () => { if (error) error.textContent = ""; });
    });
});
