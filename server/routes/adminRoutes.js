const express = require("express");
const router = express.Router();
const db = require("../config/db");


router.get("/dashboard", async (req, res) => {

    try {

        const [orders] = await db.query("SELECT COUNT(*) as totalOrders FROM orders");

        const [users] = await db.query("SELECT COUNT(*) as totalUsers FROM users");

        const [sales] = await db.query(
            "SELECT SUM(total) as totalSales FROM orders"
        );

        const [recentOrders] = await db.query(
            "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5"
        );

        res.json({
            totalOrders: orders[0].totalOrders,
            totalUsers: users[0].totalUsers,
            totalSales: sales[0].totalSales || 0,
            recentOrders
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({});
    }
});

// 📦 GET ALL ORDERS (ADMIN DASHBOARD)
router.get("/orders", async (req, res) => {
    try {

        const [orders] = await db.query(
            "SELECT * FROM orders ORDER BY created_at DESC"
        );

        res.json(orders);

    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});


// 📦 GET ORDER ITEMS
router.get("/orders/:order_id", async (req, res) => {
    try {

        const { order_id } = req.params;

        const [items] = await db.query(
            "SELECT * FROM order_items WHERE order_id = ?",
            [order_id]
        );

        res.json(items);

    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});


// ✏️ UPDATE ORDER STATUS
router.put("/order-status/:order_id", async (req, res) => {

    try {

        const { order_id } = req.params;
        const { status } = req.body;

        await db.query(
            "UPDATE orders SET status = ? WHERE order_id = ?",
            [status, order_id]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ============================
// GET ALL USERS
// ============================
router.get("/users", async (req, res) => {

    try {

        const [users] = await db.query(
            "SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC"
        );

        res.json(users);

    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

// ============================
// UPDATE USER ROLE
// ============================
router.put("/users/:id/role", async (req, res) => {

    try {

        const { id } = req.params;
        const { role, adminRole } = req.body;

        // Get target user
        const [rows] = await db.query(
            "SELECT role FROM users WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const targetRole = rows[0].role;

        // Admin cannot change owner
        if (adminRole === "admin" && targetRole === "owner") {
            return res.status(403).json({
                success: false,
                message: "Admins cannot change the owner role."
            });
        }

        // Admin cannot promote to owner
        if (adminRole === "admin" && role === "owner") {
            return res.status(403).json({
                success: false,
                message: "Only the owner can assign the owner role."
            });
        }

        await db.query(
            "UPDATE users SET role = ? WHERE id = ?",
            [role, id]
        );

        res.json({ success: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false
        });

    }

});

// =========================
// SUSPEND USER
// =========================
router.put('/users/:id/suspend', async (req, res) => {

    try {

        const { id } = req.params;
        const { days, adminRole } = req.body;

        const [rows] = await db.query(
            'SELECT role FROM users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false });
        }

        const targetRole = rows[0].role;

        // Admin cannot suspend owner
        if (adminRole === 'admin' && targetRole === 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Admins cannot suspend the owner.'
            });
        }

        // Admin cannot suspend other admins
        if (adminRole === 'admin' && targetRole === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admins cannot suspend other admins.'
            });
        }

        let suspendedUntil;

        if (days === 'permanent') {
            suspendedUntil = '9999-12-31 23:59:59';
        } else {
            const date = new Date();
            date.setDate(date.getDate() + Number(days));
            suspendedUntil = date;
        }

        await db.query(
            'UPDATE users SET suspended_until = ? WHERE id = ?',
            [suspendedUntil, id]
        );

        res.json({ success: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({ success: false });

    }

});

// =========================
// UNSUSPEND USER
// =========================
router.put("/users/:id/unsuspend", async (req, res) => {

    try {

        const { id } = req.params;

        await db.query(
            "UPDATE users SET suspended_until = NULL, suspension_reason = NULL WHERE id = ?",
            [id]
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