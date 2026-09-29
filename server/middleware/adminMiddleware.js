const db = require("../config/db");

async function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Please sign in to continue." });
    }
    try {
        const [users] = await db.query("SELECT role FROM users WHERE id = ? LIMIT 1", [req.user.id]);
        const role = String(users[0]?.role || "").toLowerCase();
        if (!["admin", "owner"].includes(role)) {
            return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
        }
        req.user.role = role;
        return next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to verify admin permissions." });
    }
}

module.exports = requireAdmin;
