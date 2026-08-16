require("dotenv").config();

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

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
const path = require("path");
app.use(express.static(path.join(__dirname, "../client")));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});