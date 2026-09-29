const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://ykb-ecommerce.onrender.com";

// Attach the short-lived JWT to existing API calls. UI profile data in
// localStorage is never sent as proof of identity.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
    const token = localStorage.getItem("token");
    if (!token) return nativeFetch(input, init);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    return nativeFetch(input, { ...init, headers });
};

window.escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));

window.safeImageUrl = (value, fallback = "images/placeholder.jpg") => {
    const source = String(value || "").trim();
    if (/^https:\/\//i.test(source) || /^http:\/\/localhost(?::\d+)?\//i.test(source)) return escapeHtml(source);
    if (/^(?:\.?\.?\/)?[\w./-]+(?:\?[\w=&%-]*)?$/.test(source)) return escapeHtml(source);
    return escapeHtml(fallback);
};

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("img:not(#header img):not(#MainImg)").forEach(image => {
        if (!image.hasAttribute("loading")) image.loading = "lazy";
        if (!image.hasAttribute("decoding")) image.decoding = "async";
    });
});
