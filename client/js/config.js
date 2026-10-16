const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://ykb-ecommerce.onrender.com";

// Resolve API origin for safe authorization header attachment
function isTrustedApiUrl(input) {
    try {
        const rawUrl = typeof input === "string" ? input : input?.url;
        if (!rawUrl) return false;
        // Resolve relative paths against current window location
        const targetUrl = new URL(rawUrl, window.location.href);
        const configuredApiOrigin = new URL(API_BASE_URL, window.location.href).origin;

        // Allow configured backend API origin or same-origin /api/ endpoints
        if (targetUrl.origin === configuredApiOrigin) return true;
        if (targetUrl.origin === window.location.origin && targetUrl.pathname.startsWith("/api/")) return true;

        return false;
    } catch {
        return false;
    }
}
window.isTrustedApiUrl = isTrustedApiUrl;

// Attach the JWT exclusively to trusted API endpoints. Never leak credentials
// to third-party CDNs, external gateways, or image hosts.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
    const token = localStorage.getItem("token");
    if (!token || !isTrustedApiUrl(input)) {
        return nativeFetch(input, init);
    }

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

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
