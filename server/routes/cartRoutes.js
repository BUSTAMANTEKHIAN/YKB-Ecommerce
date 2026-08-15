const express = require("express");
const router = express.Router();
const db = require("../config/db");


// ➕ ADD TO CART (auto merge quantity if exists)
router.post("/add", async (req, res) => {
    try {
        const {
            product_id,
            product_name,
            price,
            image,
            size,
            quantity,
            user_id
        } = req.body;

        // check if item already exists
        const checkSql = `
            SELECT * FROM cart
            WHERE product_id = ? AND size = ? AND user_id = ?
        `;

        const [existing] = await db.query(checkSql, [
            product_id,
            size,
            user_id
        ]);

        if (existing.length > 0) {
            const updateSql = `
                UPDATE cart
                SET quantity = quantity + ?
                WHERE product_id = ? AND size = ? AND user_id = ?
            `;
                    
            await db.query(updateSql, [
                quantity,
                product_id,
                size,
                user_id
            ]);

            return res.json({ success: true, message: "Cart updated (quantity increased)" });
        }

        const insertSql = `
        INSERT INTO cart
        (product_id, product_name, price, image, size, quantity, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(insertSql, [
            product_id,
            product_name,
            price,
            image,
            size,
            quantity,
            user_id
        ]);

        res.json({ success: true, message: "Product added successfully!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// GET CART
router.get("/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const [results] = await db.query(
            "SELECT * FROM cart WHERE user_id = ?",
            [userId]
        );

        const total = results.reduce((sum, item) => {
            return sum + Number(item.price) * Number(item.quantity);
        }, 0);

        res.json({
            items: results,
            total
        });

    } catch (err) {
        console.error("GET CART ERROR:", err);
        res.status(500).json({ items: [], total: 0 });
    }
});

// UPDATE QTY
router.put("/update/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { quantity } = req.body;

        await db.query(
            "UPDATE cart SET quantity = ? WHERE id = ?",
            [quantity, id]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// REMOVE ITEM
router.delete("/remove/:id", async (req, res) => {
    try {
        const id = req.params.id;

        await db.query(
            "DELETE FROM cart WHERE id = ?",
            [id]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;