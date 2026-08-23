const darkModeBtn = document.getElementById("dark-mode-btn");

if (darkModeBtn) {
    const icon = darkModeBtn.querySelector("i");

    // Load saved preference
    const darkMode = localStorage.getItem("darkMode");

    if (darkMode === "enabled") {
        document.body.classList.add("dark-mode");

        if (icon) {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        }
    }

    darkModeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");

        const enabled =
            document.body.classList.contains("dark-mode");

        localStorage.setItem(
            "darkMode",
            enabled ? "enabled" : "disabled"
        );

        if (icon) {
            icon.classList.toggle("fa-moon", !enabled);
            icon.classList.toggle("fa-sun", enabled);
        }
    });
}