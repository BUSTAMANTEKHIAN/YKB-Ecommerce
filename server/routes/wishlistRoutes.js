const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET USER WISHLIST
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [items] = await db.query(
            `SELECT
                wishlist.id,
                products.id AS product_id,
                products.name,
                products.price,
                products.image,
                products.brand,
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
            user_id,
            product_id,
            size,
            quantity
        } = req.body;

        // Validate user and product
        if (!user_id || !product_id) {
            return res.status(400).json({
                success: false,
                message: "User and product are required."
            });
        }

        // Validate size
        if (!size) {
            return res.status(400).json({
                success: false,
                message: "Please select a size."
            });
        }

        // Validate quantity
        const requestedQuantity = Number(quantity);

        if (!requestedQuantity || requestedQuantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid quantity."
            });
        }

        // Check product
        const [products] = await db.query(
            "SELECT stock FROM products WHERE id = ?",
            [product_id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const stock = Number(products[0].stock);

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
                user_id,
                product_id,
                size,
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
            "DELETE FROM wishlist WHERE id = ?",
            [req.params.id]
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