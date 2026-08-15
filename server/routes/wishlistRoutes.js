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
                products.brand
             FROM wishlist
             JOIN products ON wishlist.product_id = products.id
             WHERE wishlist.user_id = ?`,
            [userId]
        );

        res.json(items);

    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }

});

// ADD TO WISHLIST
router.post("/add", async (req, res) => {

    try {

        const { user_id, product_id } = req.body;

        await db.query(
            "INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)",
            [user_id, product_id]
        );

        res.json({
            success: true
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false
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
            success: true
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false
        });
    }

});

module.exports = router;