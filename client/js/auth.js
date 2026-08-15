document.addEventListener("DOMContentLoaded", () => {

    const user = JSON.parse(localStorage.getItem("currentUser"));
    const token = localStorage.getItem("token");

    const guestLinks = document.getElementById("guest-links");
    const userMenu = document.getElementById("user-menu");
    const username = document.getElementById("nav-username");
    const userBtn = document.getElementById("user-btn");
    const dropdown = document.getElementById("user-dropdown");

    // Show guest or logged-in state
    if (user && token) {
        guestLinks?.classList.add("hidden");
        userMenu?.classList.remove("hidden");
        if (username) username.textContent = user.fullname;
    } else {
        guestLinks?.classList.remove("hidden");
        userMenu?.classList.add("hidden");
    }

    // Toggle dropdown
    if (userBtn && dropdown) {
        userBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });

        // Close when clicking outside
        document.addEventListener("click", () => {
            dropdown.classList.remove("active");
        });

        dropdown.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    // Force My Profile navigation
    // Force My Profile navigation
    const profileLink = document.getElementById("profile-link");
    
    if (profileLink) {
        profileLink.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.assign("profile.html");
        });
    }

});

window.logout = function () {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    window.location.href = "index.html";
};