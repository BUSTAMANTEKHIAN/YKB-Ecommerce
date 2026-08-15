// =========================
// PROFILE PAGE
// =========================

const user = JSON.parse(localStorage.getItem("currentUser"));
const token = localStorage.getItem("token");

// Redirect if not logged in
if (!user || !token) {
    window.location.href = "login.html";
}

// DOM elements
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const editName = document.getElementById("edit-name");
const editEmail = document.getElementById("edit-email");
const modal = document.getElementById("modal");
const editBtn = document.getElementById("editBtn");

// Display user information
profileName.textContent = user.fullname;
profileEmail.textContent = user.email;

// Open modal
editBtn.addEventListener("click", () => {
    editName.value = user.fullname;
    editEmail.value = user.email;
    modal.style.display = "flex";
});

// Close modal
function closeModal() {
    modal.style.display = "none";
}

window.closeModal = closeModal;

// Save profile (local update for now)
function saveProfile() {

    user.fullname = editName.value.trim();
    user.email = editEmail.value.trim();

    localStorage.setItem("currentUser", JSON.stringify(user));

    profileName.textContent = user.fullname;
    profileEmail.textContent = user.email;
    
    closeModal();
    
    // Refresh navbar name immediately
    window.location.reload();

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

    const reader = new FileReader();

    reader.onload = function (e) {

        profileImage.src = e.target.result;

        localStorage.setItem("profileImage", e.target.result);

    };

    reader.readAsDataURL(file);

});

// =========================
// SAMPLE STATS
// =========================

const orderCount = document.getElementById("orderCount");
const totalSpent = document.getElementById("totalSpent");

const orders = JSON.parse(localStorage.getItem(`orders_${user.email}`)) || [];

orderCount.textContent = orders.length;

const total = orders.reduce((sum, order) => {
    return sum + Number(order.total || 0);
}, 0);

totalSpent.textContent = `₱${total.toLocaleString()}`;