require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

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

const app = express();

app.use(cors());
app.use(express.json());


// ==========================================
// PATHS
// ==========================================

const clientPath = path.resolve(__dirname, "../client");
const imagesPath = path.join(clientPath, "images");

console.log("=================================");
console.log("RAILWAY PATH DEBUG");
console.log("__dirname:", __dirname);
console.log("process.cwd():", process.cwd());
console.log("clientPath:", clientPath);
console.log("client exists:", fs.existsSync(clientPath));
console.log("imagesPath:", imagesPath);
console.log("images exists:", fs.existsSync(imagesPath));

const testImage = path.join(
    imagesPath,
    "products",
    "1786721110721.jpg"
);

console.log("test image:", testImage);
console.log("test image exists:", fs.existsSync(testImage));
console.log("=================================");


// ==========================================
// STATIC FILES
// ==========================================

// Serve the entire client folder
app.use(express.static(clientPath));

// Explicitly serve images
app.use(
    "/images",
    express.static(imagesPath)
);


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

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);


// ==========================================
// ROOT
// ==========================================

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

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});