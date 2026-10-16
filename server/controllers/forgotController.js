const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { sendPasswordResetEmail } = require("../utils/mailer");

// ==========================================
// REQUEST PASSWORD RESET
// POST /api/auth/forgot-password
// ==========================================
exports.forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Generic response used for both existing and non-existing accounts to prevent enumeration
        const genericSuccess = {
            success: true,
            message: "If an account matches that email, reset instructions will be sent."
        };

        // Check if user exists
        const [users] = await db.query(
            "SELECT id, email FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (users.length === 0) {
            return res.json(genericSuccess);
        }

        // Generate cryptographically secure single-use raw token
        const rawToken = crypto.randomBytes(32).toString("hex");
        // Store only the SHA-256 hash in the database
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

        // Expire in 15 minutes
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        // Delete any existing reset tokens for this email before inserting a new one
        await db.query(
            "DELETE FROM password_resets WHERE email = ?",
            [email]
        );

        await db.query(
            "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
            [email, tokenHash, expires]
        );

        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const resetUrl = `${appUrl}/reset-password.html?token=${encodeURIComponent(rawToken)}`;

        // Dispatch email via configured mailer provider
        await sendPasswordResetEmail({ to: email, resetUrl });

        const responsePayload = { ...genericSuccess };

        // Development-only convenience when email provider is not yet configured.
        // Never returned in production environments.
        if (process.env.NODE_ENV === "development") {
            responsePayload.resetLink = resetUrl;
        }

        return res.json(responsePayload);

    } catch (error) {
        console.error("❌ Forgot Password Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
};

// ==========================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ==========================================
exports.resetPassword = async (req, res) => {
    let connection;
    try {
        const { token, password } = req.body;

        if (!token || typeof token !== "string" || !password || typeof password !== "string") {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required."
            });
        }

        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and include a letter and a number."
            });
        }

        // Compute SHA-256 hash of provided token
        const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Look up strictly by stored SHA-256 hash
        const [tokens] = await connection.query(
            "SELECT id, email, expires_at FROM password_resets WHERE token = ? FOR UPDATE",
            [tokenHash]
        );

        if (tokens.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token."
            });
        }

        const resetRecord = tokens[0];

        // Validate expiration
        if (new Date(resetRecord.expires_at) < new Date()) {
            // Delete expired token
            await connection.query(
                "DELETE FROM password_resets WHERE id = ?",
                [resetRecord.id]
            );
            await connection.commit();
            return res.status(400).json({
                success: false,
                message: "Reset token has expired. Please request a new one."
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password
        await connection.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, resetRecord.email]
        );

        // Invalidate ALL outstanding tokens for this email to prevent reuse or race conditions
        await connection.query(
            "DELETE FROM password_resets WHERE email = ?",
            [resetRecord.email]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Password updated successfully. You can now log in."
        });

    } catch (error) {
        console.error("❌ Reset Password Error:", error);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error("❌ Rollback Error:", rbErr);
            }
        }
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    } finally {
        if (connection) connection.release();
    }
};
