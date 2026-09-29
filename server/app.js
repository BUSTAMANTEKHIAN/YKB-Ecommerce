const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const forgotRoutes = require("./routes/forgotRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");
const paymongoRoutes = require("./routes/paymongoRoutes");

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ykb-ecommerce.onrender.com",
    ...(process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean)
]);

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production" && req.secure) {
        res.setHeader("Strict-Transport-Security", "max-age=15552000");
    }
    next();
});

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Paymongo-Signature"],
    maxAge: 600
}));

// PayMongo webhook MUST receive the raw body
app.use(
    "/api/paymongo/webhook",
    express.raw({
        type: "application/json"
    })
);

// Normal JSON requests
app.use(express.json());


// ================================
// SERVE CLIENT FILES
// ================================

const clientPath = path.join(__dirname, "../client");

app.use(express.static(clientPath));


// ==========================================
// API ROUTES
// ==========================================

app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", forgotRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/paymongo", paymongoRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);


// ==========================================
// ROOT
// ==========================================

// Support the clean URL as well as the existing about.html links.
app.get("/about", (req, res) => {
    res.sendFile(path.join(clientPath, "about.html"));
});

app.get("/", (req, res) => {
    res.json({
        message: "🚀 YKB Clothing API is running",
        database: "Connected"
    });
});


// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
