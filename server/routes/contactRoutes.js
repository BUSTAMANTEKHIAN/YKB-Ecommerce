const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Save contact message
router.post("/send", async (req, res) => {
    try {

        const { name, email, subject, message } = req.body;

        await db.query(
            "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
            [name, email, subject, message]
        );

        res.json({ success: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({ success: false });

    }
});

// Get all messages (admin)
router.get("/admin", async (req, res) => {
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
router.delete("/admin/:id", async (req, res) => {
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