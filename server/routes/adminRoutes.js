const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticate = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");
router.use(authenticate, requireAdmin);


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
        const allowedStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Choose a valid order status." });
        }

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
            "SELECT id, fullname, email, role, created_at FROM users ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, created_at DESC, id ASC"
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
        const { role } = req.body;
        const adminRole = req.user.role;
        if (!["user", "admin", "owner"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid account role." });
        }
        if (Number(id) === req.user.id) {
            return res.status(400).json({ success: false, message: "You cannot change your own role." });
        }

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
        const { days } = req.body;
        const adminRole = req.user.role;
        if (!([1, 3, 7, 30].includes(Number(days)) || days === "permanent")) {
            return res.status(400).json({ success: false, message: "Choose a valid suspension duration." });
        }
        if (Number(id) === req.user.id) {
            return res.status(400).json({ success: false, message: "You cannot suspend your own account." });
        }

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
