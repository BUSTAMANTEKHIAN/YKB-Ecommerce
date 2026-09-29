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
const editPhone = document.getElementById("edit-phone");
const editAddress = document.getElementById("edit-address");
const editCity = document.getElementById("edit-city");
const editPostalCode = document.getElementById("edit-postal-code");
const modal = document.getElementById("modal");
const editBtn = document.getElementById("editBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const toastStack = document.getElementById("toast-stack");

let profile = { ...user, phone: "", address: "", city: "", postalCode: "" };

function renderProfile() {
    profileName.textContent = profile.fullname || "YKB Member";
    profileEmail.textContent = profile.email || "";
    document.getElementById("detail-name").textContent = profile.fullname || "—";
    document.getElementById("detail-email").textContent = profile.email || "—";
    document.getElementById("detail-phone").textContent = profile.phone || "Not added yet";

    const addressEl = document.getElementById("profile-address");
    if (profile.address && profile.city && profile.postalCode) {
        addressEl.innerHTML = `
            <i class="fas fa-map-marked-alt" aria-hidden="true"></i>
            <div><strong>${escapeHtml(profile.address)}</strong>
            <p>${escapeHtml(profile.city)} ${escapeHtml(profile.postalCode)}${profile.phone ? ` · ${escapeHtml(profile.phone)}` : ""}</p></div>
        `;
    } else {
        addressEl.innerHTML = `
            <i class="fas fa-map-marked-alt" aria-hidden="true"></i>
            <p>No saved address yet. Your first checkout will save your delivery details here.</p>
        `;
    }
}

async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`);
        const data = await response.json();
        if (!response.ok || !data.profile) throw new Error(data.message || "Unable to load profile.");
        profile = data.profile;
        Object.assign(user, profile);
        localStorage.setItem("currentUser", JSON.stringify(user));
        renderProfile();
    } catch (error) {
        console.error("Profile load failed:", error);
        showToast(error.message || "Unable to load profile details.", "error");
    }
}

renderProfile();
document.getElementById("editAddressBtn").addEventListener("click", () => editBtn.click());
document.addEventListener("DOMContentLoaded", loadProfile);

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
    editName.value = profile.fullname || "";
    editEmail.value = profile.email || "";
    editPhone.value = profile.phone || "";
    editAddress.value = profile.address || "";
    editCity.value = profile.city || "";
    editPostalCode.value = profile.postalCode || "";
    clearFieldErrors();
    modal.style.display = "flex";
});

// Close modal
function closeModal() {
    modal.style.display = "none";
}
window.closeModal = closeModal;

function clearFieldErrors() {
    document.querySelectorAll(".modal-box .field-error").forEach(error => error.textContent = "");
    document.querySelectorAll(".modal-box input").forEach(input => input.classList.remove("has-error"));
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
async function saveProfile() {

    if (!validateProfileForm()) return;

    const newName = editName.value.trim();
    const newEmail = editEmail.value.trim();
    const updatedProfile = {
        fullname: newName,
        email: newEmail,
        phone: editPhone.value.trim(),
        address: editAddress.value.trim(),
        city: editCity.value.trim(),
        postalCode: editPostalCode.value.trim()
    };

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Saving...";

    try {

        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProfile)
        });

        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || `Server responded ${response.status}`);

        profile = data.profile;
        Object.assign(user, profile);
        localStorage.setItem("currentUser", JSON.stringify(user));
        renderProfile();

        showToast("Profile updated.", "success");
        closeModal();

    } catch (err) {
        console.error("Profile update failed:", err);
        showToast(err.message || "Couldn't save profile changes.", "error");

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
