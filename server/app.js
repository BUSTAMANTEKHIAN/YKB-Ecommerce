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


// ================================
// SERVE CLIENT FILES
// ================================

const clientPath = path.join(__dirname, "../client");

console.log("=================================");
console.log("CLIENT FILE DEBUG");
console.log("__dirname:", __dirname);
console.log("clientPath:", clientPath);
console.log("client exists:", fs.existsSync(clientPath));

const imagePath = path.join(
    clientPath,
    "images/products/1786721110721.jpg"
);

console.log("imagePath:", imagePath);
console.log("image exists:", fs.existsSync(imagePath));
console.log("=================================");

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