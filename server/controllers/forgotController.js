const db = require("../config/db");
const crypto = require("crypto");

exports.forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        // Check if user exists
        const [users] = await db.query(
            "SELECT id, email FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) return res.json({ success: true, message: "If an account matches that email, reset instructions will be sent." });

        // Generate secure token
        const token = crypto.randomBytes(32).toString("hex");

        // Expire in 15 minutes
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        // Remove old tokens for this email
        await db.query(
            "DELETE FROM password_resets WHERE email = ?",
            [email]
        );

        // Store new token
        await db.query(
            "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
            [email, crypto.createHash("sha256").update(token).digest("hex"), expires]
        );

        const response = {
            success: true,
            message: "If an account matches that email, reset instructions will be sent."
        };
        // Development-only convenience until an email provider is configured.
        // Never return or log reset tokens in production.
        if (process.env.NODE_ENV === "development") {
            response.resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password.html?token=${token}`;
        }
        return res.json(response);

    } catch (error) {
        console.error("Forgot Password Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
};

const bcrypt = require("bcrypt");

exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Token and password are required."
            });
        }

        if (typeof password !== "string" || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and include a letter and a number."
            });
        }

        // Check token
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const [tokens] = await db.query(
            "SELECT * FROM password_resets WHERE token = ? OR token = ? LIMIT 1",
            [tokenHash, token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid reset token."
            });
        }

        const reset = tokens[0];

        // Check expiration
        if (new Date(reset.expires_at) < new Date()) {
            await db.query(
                "DELETE FROM password_resets WHERE token = ?",
                [token]
            );

            return res.status(400).json({
                success: false,
                message: "Reset token has expired."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password
        await db.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, reset.email]
        );

        // Delete token after use
        await db.query(
            "DELETE FROM password_resets WHERE token = ?",
            [token]
        );

        return res.json({
            success: true,
            message: "Password updated successfully."
        });

    } catch (error) {
        console.error("Reset Password Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
};
