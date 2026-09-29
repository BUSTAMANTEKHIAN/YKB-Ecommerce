const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticate = require("../middleware/authMiddleware");
router.use(authenticate);

const isAccessory = (category) => {
    const normalized = String(category || "").trim().toLowerCase();
    return normalized === "accessory" || normalized === "accessories";
};

// GET USER WISHLIST
router.get("/:userId", async (req, res) => {
    try {
        const userId = req.user.id;

        const [items] = await db.query(
            `SELECT
                wishlist.id,
                products.id AS product_id,
                products.name,
                products.price,
                products.image,
                products.brand,
                products.category,
                wishlist.size,
                wishlist.quantity,
                wishlist.created_at
             FROM wishlist
             JOIN products
                ON wishlist.product_id = products.id
             WHERE wishlist.user_id = ?
             ORDER BY wishlist.created_at DESC`,
            [userId]
        );

        items.forEach(item => {
            if (isAccessory(item.category)) item.size = null;
        });

        res.json(items);

    } catch (err) {
        console.error("GET WISHLIST ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Failed to load wishlist."
        });
    }
});


// ADD TO WISHLIST
router.post("/add", async (req, res) => {
    try {
        const {
            product_id,
            size,
            quantity
        } = req.body;

        // Validate user and product
        if (!product_id) {
            return res.status(400).json({
                success: false,
                message: "User and product are required."
            });
        }

        // Validate quantity
        const requestedQuantity = Number(quantity);

        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 99) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid quantity."
            });
        }

        // Check product
        const [products] = await db.query(
            "SELECT stock, category FROM products WHERE id = ?",
            [product_id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const stock = Number(products[0].stock);
        const wishlistSize = isAccessory(products[0].category) ? null : (size || null);

        if (wishlistSize && !/^[\p{L}\d -]{1,20}$/u.test(String(wishlistSize))) {
            return res.status(400).json({ success: false, message: "Choose a valid size." });
        }

        if (!isAccessory(products[0].category) && !wishlistSize) {
            return res.status(400).json({ success: false, message: "Please select a size." });
        }

        if (stock <= 0) {
            return res.status(400).json({
                success: false,
                message: "This product is out of stock."
            });
        }

        if (requestedQuantity > stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${stock} item(s) available.`
            });
        }

        // Add or update wishlist
        await db.query(
            `INSERT INTO wishlist
                (user_id, product_id, size, quantity)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                size = VALUES(size),
                quantity = VALUES(quantity)`,
            [
                req.user.id,
                product_id,
                wishlistSize,
                requestedQuantity
            ]
        );

        res.json({
            success: true,
            message: "Added to wishlist!"
        });

    } catch (err) {
        console.error("ADD WISHLIST ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Failed to add to wishlist."
        });
    }
});


// REMOVE FROM WISHLIST
router.delete("/remove/:id", async (req, res) => {
    try {
        await db.query(
            "DELETE FROM wishlist WHERE id = ? AND user_id = ?",
            [req.params.id, req.user.id]
        );

        res.json({
            success: true,
            message: "Removed from wishlist."
        });

    } catch (err) {
        console.error("REMOVE WISHLIST ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Failed to remove from wishlist."
        });
    }
});


module.exports = router;
