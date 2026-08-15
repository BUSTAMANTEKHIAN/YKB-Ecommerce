window.logout = function () {
    localStorage.removeItem("currentUser"); // or localStorage.clear()
    window.location.href = "login.html";
}