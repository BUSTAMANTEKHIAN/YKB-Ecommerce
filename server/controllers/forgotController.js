const db = require("../config/db");
const crypto = require("crypto");

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

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

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No account found with that email."
            });
        }

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
            [email, token, expires]
        );

        const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

        // Development: print link in terminal
        console.log("====================================");
        console.log("PASSWORD RESET LINK:");
        console.log(resetLink);
        console.log("====================================");

        return res.json({
            success: true,
            message: "Reset link generated successfully.",
            resetLink
        });

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

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        // Check token
        const [tokens] = await db.query(
            "SELECT * FROM password_resets WHERE token = ?",
            [token]
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