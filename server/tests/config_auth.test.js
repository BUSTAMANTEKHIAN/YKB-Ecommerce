const fs = require("fs");
const path = require("path");

global.window = {
    location: {
        hostname: "localhost",
        href: "http://localhost:3000/shop.html",
        origin: "http://localhost:3000"
    },
    fetch: () => {}
};
global.document = {
    addEventListener: () => {},
    querySelectorAll: () => []
};

const configCode = fs.readFileSync(path.join(__dirname, "../../client/js/config.js"), "utf8");
eval(configCode);

console.log("--- Testing isTrustedApiUrl in client/js/config.js ---");

const testCases = [
    { url: "http://localhost:3000/api/orders", expected: true, desc: "Local API URL" },
    { url: "/api/orders/checkout", expected: true, desc: "Relative API path" },
    { url: "https://ykb-ecommerce.onrender.com/api/products", expected: false, desc: "Remote API when localhost is active (origin mismatch)" },
    { url: "https://res.cloudinary.com/demo/image.png", expected: false, desc: "Cloudinary CDN (untrusted)" },
    { url: "https://api.paymongo.com/v2/checkout_sessions", expected: false, desc: "Direct PayMongo API (untrusted for client JWT)" },
    { url: "https://evil-attacker.com/steal-token", expected: false, desc: "Third-party host (untrusted)" },
    { url: "http://localhost:3000.evil.com/api", expected: false, desc: "Subdomain spoofing (untrusted)" },
    { url: "javascript:void(0)", expected: false, desc: "Malicious pseudo-protocol" }
];

let allPassed = true;
for (const tc of testCases) {
    const result = window.isTrustedApiUrl(tc.url);
    const pass = result === tc.expected;
    console.log(`[${pass ? "PASS" : "FAIL"}] ${tc.desc}: got ${result}, expected ${tc.expected}`);
    if (!pass) allPassed = false;
}

if (!allPassed) {
    console.error("Config URL trust tests failed!");
    process.exit(1);
} else {
    console.log("All Config URL trust tests passed!");
    process.exit(0);
}

