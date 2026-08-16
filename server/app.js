require("dotenv").config();

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

const express = require("express");
const cors = require("cors");
const path = require("path");

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

app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", forgotRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);


const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        message: "🚀 YKB Clothing API is running",
        database: "Connected"
    });
});
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// Serve client folder

app.use(express.static(path.join(__dirname, "../client")));

const fs = require("fs");

console.log("=== RAILWAY FILE DEBUG ===");
console.log("__dirname:", __dirname);
console.log("process.cwd():", process.cwd());

const clientPath = path.join(__dirname, "../client");
const productsPath = path.join(clientPath, "images/products");

console.log("Client path:", clientPath);
console.log("Client exists:", fs.existsSync(clientPath));

console.log("Products path:", productsPath);
console.log("Products folder exists:", fs.existsSync(productsPath));

if (fs.existsSync(productsPath)) {
    console.log(
        "Product images:",
        fs.readdirSync(productsPath).slice(0, 20)
    );
}

const imagePath = path.join(
    productsPath,
    "1786721110721.jpg"
);

console.log("Image path:", imagePath);
console.log("Image exists:", fs.existsSync(imagePath));

console.log("==========================");

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

