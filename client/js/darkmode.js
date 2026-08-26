// ==========================================
// YKB CLOTHING - DARK MODE
// ==========================================

(function () {

    // ------------------------------------------
    // APPLY SAVED THEME IMMEDIATELY
    // ------------------------------------------

    const savedMode = localStorage.getItem("darkMode");

    if (savedMode === "enabled") {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }

    // ------------------------------------------
    // INITIALIZE BUTTON
    // ------------------------------------------

    function initializeDarkMode() {

        const darkModeBtn =
            document.getElementById("dark-mode-btn");

        if (!darkModeBtn) {
            console.warn("Dark mode button not found on this page.");
            return;
        }

        // Prevent duplicate initialization
        if (darkModeBtn.dataset.darkModeReady === "true") {
            return;
        }

        darkModeBtn.dataset.darkModeReady = "true";

        // ------------------------------------------
        // UPDATE ICON
        // ------------------------------------------

        function updateDarkModeIcon() {

            const icon = darkModeBtn.querySelector("i");

            if (!icon) return;

            const isDark =
                document.body.classList.contains("dark-mode");

            if (isDark) {

                icon.classList.remove("fa-moon");
                icon.classList.add("fa-sun");

                darkModeBtn.setAttribute(
                    "aria-label",
                    "Switch to light mode"
                );

                darkModeBtn.setAttribute(
                    "title",
                    "Switch to light mode"
                );

            } else {

                icon.classList.remove("fa-sun");
                icon.classList.add("fa-moon");

                darkModeBtn.setAttribute(
                    "aria-label",
                    "Switch to dark mode"
                );

                darkModeBtn.setAttribute(
                    "title",
                    "Switch to dark mode"
                );
            }
        }

        // ------------------------------------------
        // INITIAL ICON
        // ------------------------------------------

        updateDarkModeIcon();

        // ------------------------------------------
        // BUTTON CLICK
        // ------------------------------------------

        darkModeBtn.addEventListener("click", function (event) {

            event.preventDefault();
            event.stopPropagation();

            const isDark =
                document.body.classList.toggle("dark-mode");

            localStorage.setItem(
                "darkMode",
                isDark ? "enabled" : "disabled"
            );

            updateDarkModeIcon();

            console.log(
                "Dark mode:",
                isDark ? "ENABLED" : "DISABLED"
            );

        });

        console.log(
            "Dark mode initialized:",
            document.body.classList.contains("dark-mode")
                ? "ENABLED"
                : "DISABLED"
        );
    }

    // ------------------------------------------
    // INITIALIZE AFTER HTML LOAD
    // ------------------------------------------

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initializeDarkMode
        );

    } else {

        initializeDarkMode();

    }

})();