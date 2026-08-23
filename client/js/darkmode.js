const darkModeBtn = document.getElementById("dark-mode-btn");

const savedMode = localStorage.getItem("darkMode");

if (savedMode === "enabled") {
    document.body.classList.add("dark-mode");
}

function updateDarkModeIcon() {
    if (!darkModeBtn) return;

    const icon = darkModeBtn.querySelector("i");

    if (!icon) return;

    if (document.body.classList.contains("dark-mode")) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    } else {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
    }
}

updateDarkModeIcon();

if (darkModeBtn) {
    darkModeBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

        const enabled =
            document.body.classList.contains("dark-mode");

        localStorage.setItem(
            "darkMode",
            enabled ? "enabled" : "disabled"
        );

        updateDarkModeIcon();
    });
}