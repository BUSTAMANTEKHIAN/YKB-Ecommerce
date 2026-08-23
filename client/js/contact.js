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

        const response = await fetch(`${API_BASE_URL}/api/contact/send`, {
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

        // Previously missing: without this check, a 4xx/5xx response with a
        // non-JSON body (e.g. an HTML error page from a proxy or a dead
        // route) would throw inside response.json() and get reported as a
        // generic "Server error" instead of the real cause, or in some
        // cases silently pass a malformed `data` object through to the
        // success branch below.
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showToast("Message sent successfully!");
            form.reset();
        } else {
            showToast(data.message || "Failed to send message.", "error");
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
// =========================
const newsletterForm = document.getElementById("newsletter-form");

if (newsletterForm) {

    const newsletterInput = document.getElementById("newsletter-email");
    const newsletterBtn = document.getElementById("newsletter-submit-btn");
    const newsletterError = document.getElementById("newsletter-error");
    const newsletterLabel = newsletterBtn.querySelector(".btn-label");

    function showNewsletterError(message) {
        if (newsletterError) {
            newsletterError.textContent = message;
            newsletterError.classList.add("show");
        }
        newsletterInput.classList.add("has-error");
    }

    function clearNewsletterError() {
        if (newsletterError) {
            newsletterError.textContent = "";
            newsletterError.classList.remove("show");
        }
        newsletterInput.classList.remove("has-error");
    }

    newsletterInput.addEventListener("input", () => {
        if (newsletterInput.value.trim() === "" || newsletterInput.checkValidity()) {
            clearNewsletterError();
        }
    });

    newsletterForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const email = newsletterInput.value.trim();

        if (!email) {
            showNewsletterError("Enter your email address.");
            showToast("Please enter a valid email address.", "error");
            newsletterInput.focus();
            return;
        }

        if (!newsletterInput.checkValidity()) {
            showNewsletterError("Enter a valid email address.");
            showToast("Please enter a valid email address.", "error");
            newsletterInput.focus();
            return;
        }

        clearNewsletterError();
        newsletterBtn.disabled = true;
        const originalLabel = newsletterLabel ? newsletterLabel.textContent : null;
        if (newsletterLabel) newsletterLabel.textContent = "Signing up...";

        let subscribers =
            JSON.parse(localStorage.getItem("newsletterSubscribers")) || [];

        if (subscribers.includes(email)) {

            showToast("You're already signed up!", "default");
            newsletterBtn.disabled = false;
            if (newsletterLabel) newsletterLabel.textContent = originalLabel;
            return;

        }

        subscribers.push(email);
        localStorage.setItem("newsletterSubscribers", JSON.stringify(subscribers));

        showToast("You're subscribed! Watch your inbox for offers.", "default");
        newsletterForm.reset();
        newsletterBtn.disabled = false;
        if (newsletterLabel) newsletterLabel.textContent = originalLabel;

    });

}