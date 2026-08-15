const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ============================
// CHECKOUT ROUTE
// ============================
router.post("/checkout", async (req, res) => {

    try {
        const { user_id, payment_method, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const order_id = "YKB-" + Date.now();

        let total = 0;

        items.forEach(item => {
            total += item.price * item.quantity;
        });

        // save order
        await db.query(
            "INSERT INTO orders (order_id, user_id, total, payment_method) VALUES (?, ?, ?, ?)",
            [order_id, user_id, total, payment_method]
        );

        // save items
        for (let item of items) {

    // Save order item
    await db.query(
        "INSERT INTO order_items (order_id, product_name, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?)",
        [
            order_id,
            item.product_name,
            item.price,
            item.quantity,
            item.price * item.quantity
        ]
    );

    // Reduce product stock
    await db.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [
            item.quantity,
            item.product_id
        ]
    );

    await db.query(
        "UPDATE products SET stock = 0 WHERE stock < 0"
    );
}

        // clear cart
        await db.query(
            "DELETE FROM cart WHERE user_id = ?",
            [user_id]
        );

        res.json({
            success: true,
            order_id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ============================
// GET ALL ORDERS (ADMIN)
// ============================
router.get("/admin/all", async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT
                orders.order_id,
                orders.total,
                orders.status,
                orders.payment_method,
                orders.created_at,
                users.fullname,
                users.email
             FROM orders
             JOIN users ON orders.user_id = users.id
             ORDER BY orders.created_at DESC`
        );

        res.json(orders);

    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

// ============================
// UPDATE ORDER STATUS (ADMIN)
// ============================

router.put("/admin/:order_id/status", async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status } = req.body;

        await db.query(
            "UPDATE orders SET status = ? WHERE order_id = ?",
            [status, order_id]
        );

        res.json({
            success: true,
            message: "Order status updated successfully."
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false
        });
    }
});

router.get("/last/:user_id", async (req, res) => {

    try {
        const { user_id } = req.params;

        const [order] = await db.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            [user_id]
        );

        if (order.length === 0) {
            return res.json(null);
        }

        const [items] = await db.query(
            "SELECT * FROM order_items WHERE order_id = ?",
            [order[0].order_id]
        );

        res.json({
            order: order[0],
            items
        });

    } catch (err) {
        console.error(err);
        res.status(500).json(null);
    }
});

// ============================
// ADMIN ORDER DETAILS
// ============================
router.get("/admin/:order_id", async (req, res) => {
    try {
        const { order_id } = req.params;

        const [orderRows] = await db.query(
            `SELECT
                orders.*,
                users.fullname,
                users.email
             FROM orders
             JOIN users ON orders.user_id = users.id
             WHERE orders.order_id = ?`,
            [order_id]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const [items] = await db.query(
            "SELECT * FROM order_items WHERE order_id = ?",
            [order_id]
        );

        res.json({
            order: orderRows[0],
            items
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/receipt/:order_id", async (req, res) => {

    try {
        const { order_id } = req.params;

        const [order] = await db.query(
            "SELECT * FROM orders WHERE order_id = ?",
            [order_id]
        );

        if (order.length === 0) {
            return res.json(null);
        }

        const [items] = await db.query(
            "SELECT * FROM order_items WHERE order_id = ?",
            [order_id]
        );

        res.json({
            order: order[0],
            items
        });

    } catch (err) {
        console.error(err);
        res.status(500).json(null);
    }
});

router.get("/:user_id", async (req, res) => {

    try {
        const { user_id } = req.params;

        const [orders] = await db.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [user_id]
        );

        res.json(orders);

    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
}); 

module.exports = router;