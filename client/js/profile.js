// =========================
// PROFILE PAGE
// =========================

const user = JSON.parse(localStorage.getItem("currentUser"));
const token = localStorage.getItem("token");

// Guard now actually stops execution — before, the redirect fired but the
// script kept running and crashed on `user.fullname` being read off null.
if (!user || !token) {
    window.location.href = "login.html";
    throw new Error("Not logged in — redirecting.");
}

// DOM elements
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const editName = document.getElementById("edit-name");
const editEmail = document.getElementById("edit-email");
const modal = document.getElementById("modal");
const editBtn = document.getElementById("editBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const toastStack = document.getElementById("toast-stack");

// Display user information
profileName.textContent = user.fullname;
profileEmail.textContent = user.email;

// =========================
// TOASTS
// =========================
function showToast(message, type = "default") {
    if (!toastStack) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toastStack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("animationend", () => toast.remove());
    }, 2600);
}

// Open modal
editBtn.addEventListener("click", () => {
    editName.value = user.fullname;
    editEmail.value = user.email;
    clearFieldErrors();
    modal.style.display = "flex";
});

// Close modal
function closeModal() {
    modal.style.display = "none";
}
window.closeModal = closeModal;

function clearFieldErrors() {
    document.getElementById("edit-name-error").textContent = "";
    document.getElementById("edit-email-error").textContent = "";
    editName.classList.remove("has-error");
    editEmail.classList.remove("has-error");
}

function validateProfileForm() {

    clearFieldErrors();
    let isValid = true;

    const name = editName.value.trim();
    const email = editEmail.value.trim();

    if (!name) {
        document.getElementById("edit-name-error").textContent = "Name is required.";
        editName.classList.add("has-error");
        isValid = false;
    }

    if (!email) {
        document.getElementById("edit-email-error").textContent = "Email is required.";
        editEmail.classList.add("has-error");
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById("edit-email-error").textContent = "Enter a valid email.";
        editEmail.classList.add("has-error");
        isValid = false;
    }

    return isValid;
}

// =========================
// SAVE PROFILE
// =========================
// NOTE: No confirmed backend endpoint for updating a user profile exists
// yet in the API list I have (/api/auth/login, /api/auth/register, cart
// endpoints only). This calls a placeholder PUT to /api/auth/profile —
// swap in the real path once the backend route exists. Until then this
// falls back to a localStorage-only update so the UI still works, but
// changes won't persist across devices or logins.
async function saveProfile() {

    if (!validateProfileForm()) return;

    const newName = editName.value.trim();
    const newEmail = editEmail.value.trim();

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Saving...";

    try {

        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                fullname: newName,
                email: newEmail
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        user.fullname = newName;
        user.email = newEmail;
        localStorage.setItem("currentUser", JSON.stringify(user));

        profileName.textContent = user.fullname;
        profileEmail.textContent = user.email;

        showToast("Profile updated.", "success");
        closeModal();

    } catch (err) {

        console.error("Profile update failed, saving locally only:", err);

        // Fallback so the page still functions until the backend route exists —
        // remove this fallback once /api/auth/profile is confirmed working.
        user.fullname = newName;
        user.email = newEmail;
        localStorage.setItem("currentUser", JSON.stringify(user));

        profileName.textContent = user.fullname;
        profileEmail.textContent = user.email;

        showToast("Saved locally — couldn't reach the server.", "error");
        closeModal();

    } finally {

        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save";

    }

}
window.saveProfile = saveProfile;

// Logout
function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    window.location.href = "index.html";
}
window.logout = logout;

// =========================
// PROFILE IMAGE
// =========================

const uploadInput = document.getElementById("upload-image");
const profileImage = document.getElementById("profile-image");

const savedImage = localStorage.getItem("profileImage");

if (savedImage) {
    profileImage.src = savedImage;
}

uploadInput.addEventListener("change", () => {

    const file = uploadInput.files[0];
    if (!file) return;

    // Basic guardrails that were missing before: reject non-images and
    // anything too large to safely fit in localStorage's ~5-10MB quota.
    if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.", "error");
        uploadInput.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast("Image must be smaller than 2MB.", "error");
        uploadInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {

        try {
            localStorage.setItem("profileImage", e.target.result);
            profileImage.src = e.target.result;
            showToast("Profile photo updated.", "success");
        } catch (err) {
            console.error("Failed to save profile image:", err);
            showToast("Couldn't save that image — try a smaller file.", "error");
        }

    };

    reader.onerror = function () {
        showToast("Couldn't read that file.", "error");
    };

    reader.readAsDataURL(file);

});

// =========================
// ORDER STATS
// =========================
// Previously read from a localStorage key ("orders_<email>") that nothing
// in the project ever writes to, so this always showed 0 / ₱0. Orders
// actually live in MySQL and are fetched via /api/orders/:id, same
// endpoint orders.js already uses.
async function loadProfileStats() {

    const orderCountEl = document.getElementById("orderCount");
    const totalSpentEl = document.getElementById("totalSpent");

    try {

        const response = await fetch(`${API_BASE_URL}/api/orders/${user.id}`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const orders = await response.json();

        orderCountEl.textContent = orders.length;

        const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        totalSpentEl.textContent = `₱${total.toLocaleString()}`;

    } catch (err) {
        console.error("Failed to load profile stats:", err);
        orderCountEl.textContent = "—";
        totalSpentEl.textContent = "—";
    }

}

document.addEventListener("DOMContentLoaded", loadProfileStats);