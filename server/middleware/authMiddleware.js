const jwt = require("jsonwebtoken");
const db = require("../config/db");

async function authenticate(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
        return res.status(401).json({ success: false, message: "Please sign in to continue." });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, message: "Authentication is not configured." });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (error) {
        return res.status(401).json({ success: false, message: "Your session is invalid or expired. Please sign in again." });
    }

    const userId = Number(payload?.id);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(401).json({ success: false, message: "Invalid session." });
    }

    let users;
    try {
        [users] = await db.query(
            "SELECT id, role, suspended_until FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
    } catch (error) {
        console.error("Authentication lookup failed:", error.code || "unexpected error");
        return res.status(503).json({ success: false, message: "Unable to verify your account right now." });
    }

    if (!users.length) {
        return res.status(401).json({ success: false, message: "This account is no longer available." });
    }

    const suspendedUntil = users[0].suspended_until;
    if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
        return res.status(403).json({ success: false, message: "This account is suspended." });
    }

    req.user = {
        id: Number(users[0].id),
        role: users[0].role,
        email: payload.email
    };
    return next();
}

module.exports = authenticate;
