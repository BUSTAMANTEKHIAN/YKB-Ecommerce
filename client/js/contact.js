// Initialize EmailJS
emailjs.init({
    publicKey: "C3vw58L36Rb8gkgm0"
});

const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("contact-submit-btn");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const subjectInput = document.getElementById("subject");
const messageInput = document.getElementById("message");

// =========================
// TOASTS (replaces alert())
// =========================
function showToast(message, type = "default") {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("animationend", () => toast.remove());
    }, 2800);
}

// =========================
// VALIDATION
// =========================
function validateContactForm() {

    let isValid = true;
    let firstInvalid = null;

    const fields = [nameInput, emailInput, messageInput];

    fields.forEach(input => {

        const errorEl = form.querySelector(`[data-error-for="${input.id}"]`);
        input.classList.remove("has-error");
        if (errorEl) errorEl.textContent = "";

        if (!input.checkValidity()) {

            isValid = false;
            input.classList.add("has-error");

            if (errorEl) {
                if (input.validity.valueMissing) {
                    errorEl.textContent = "This field is required.";
                } else if (input.validity.typeMismatch) {
                    errorEl.textContent = "Please enter a valid email address.";
                } else if (input.validity.tooShort) {
                    errorEl.textContent = `Please write at least ${input.minLength} characters.`;
                } else {
                    errorEl.textContent = "Please check this field.";
                }
            }

            if (!firstInvalid) firstInvalid = input;

        }

    });

    if (firstInvalid) firstInvalid.focus();

    return isValid;

}

function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.classList.toggle("is-loading", isSubmitting);
}

// =========================
// CONTACT FORM SUBMIT
// =========================
form.addEventListener("submit", async function (e) {

    e.preventDefault();

    if (!validateContactForm()) {
        showToast("Please fix the highlighted fields.", "error");
        return;
    }

    setSubmitting(true);

    try {

        const response = await fetch("http://localhost:3000/api/contact/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                subject: subjectInput.value.trim(),
                message: messageInput.value.trim()
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast("Message sent successfully!");
            form.reset();
        } else {
            showToast("Failed to send message.", "error");
        }

    } catch (err) {

        console.error(err);

        showToast("Server error. Please try again.", "error");

    } finally {

        setSubmitting(false);

    }

});

// =========================
// NEWSLETTER SIGNUP
// (Previously had no JS at all — the button did nothing.)
// =========================
const newsletterForm = document.getElementById("newsletter-form");

if (newsletterForm) {

    const newsletterInput = document.getElementById("newsletter-email");
    const newsletterBtn = document.getElementById("newsletter-submit-btn");

    newsletterForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const email = newsletterInput.value.trim();

        if (!email || !newsletterInput.checkValidity()) {
            showToast("Please enter a valid email address.", "error");
            return;
        }

        newsletterBtn.disabled = true;

        let subscribers =
            JSON.parse(localStorage.getItem("newsletterSubscribers")) || [];

        if (subscribers.includes(email)) {

            showToast("You're already signed up!", "default");
            newsletterBtn.disabled = false;
            return;

        }

        subscribers.push(email);
        localStorage.setItem("newsletterSubscribers", JSON.stringify(subscribers));

        showToast("You're subscribed! Watch your inbox for offers.", "default");
        newsletterForm.reset();
        newsletterBtn.disabled = false;

    });

}