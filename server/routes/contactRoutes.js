const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticate = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

// Save contact message
router.post("/send", async (req, res) => {
    try {

        const { name, email, subject, message } = req.body;

        if ([name, email, subject, message].some(value => typeof value !== "string" || !value.trim()) ||
            name.length > 200 || email.length > 254 || subject.length > 200 || message.length > 5000 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Enter a valid name, email, subject, and message." });
        }

        await db.query(
            "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
            [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
        );

        res.json({ success: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({ success: false });

    }
});

// Get all messages (admin)
router.get("/admin", authenticate, requireAdmin, async (req, res) => {
    try {

        const [messages] = await db.query(
            "SELECT * FROM contact_messages ORDER BY created_at DESC"
        );

        res.json(messages);

    } catch (err) {

        console.error(err);

        res.status(500).json([]);

    }
});

// Delete message (admin)
router.delete("/admin/:id", authenticate, requireAdmin, async (req, res) => {
    try {

        await db.query(
            "DELETE FROM contact_messages WHERE id = ?",
            [req.params.id]
        );

        res.json({ success: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({ success: false });

    }
});

module.exports = router;
