const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ==========================================
// REGISTER
// ==========================================
exports.register = async (req, res) => {
    try {
        let { fullname, email, password } = req.body;

        // Clean input
        fullname = fullname?.trim();
        email = email?.trim().toLowerCase();

        // Validate
        if (!fullname || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        // Check existing email
        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.query(
            `INSERT INTO users (fullname, email, password)
             VALUES (?, ?, ?)`,
            [fullname, email, hashedPassword]
        );

        console.log("✅ New user registered:", {
            id: result.insertId,
            fullname,
            email
        });

        return res.status(201).json({
            success: true,
            message: "Registration successful!"
        });

    } catch (err) {

        console.error("❌ REGISTER ERROR:");
        console.error(err);

        // Duplicate email safety
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Email already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message || "Registration failed."
        });
    }
};


// ==========================================
// LOGIN
// ==========================================
exports.login = async (req, res) => {

    try {

        let { email, password } = req.body;

        email = email?.trim().toLowerCase();

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email and password."
            });
        }

        // Find user
        const [result] = await db.query(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (result.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result[0];


        // ==========================================
        // CHECK IF USER IS SUSPENDED
        // ==========================================

        if (user.suspended_until) {

            // Permanent ban
            if (
                String(user.suspended_until) ===
                "9999-12-31 23:59:59"
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has been permanently banned."
                });
            }

            const suspendedUntil = new Date(user.suspended_until);
            const now = new Date();

            if (suspendedUntil > now) {

                return res.status(403).json({
                    success: false,
                    message:
                        `Your account is suspended until ${suspendedUntil.toLocaleString()}.`
                });
            }

            // Suspension expired
            await db.query(
                `UPDATE users
                 SET suspended_until = NULL,
                     suspension_reason = NULL
                 WHERE id = ?`,
                [user.id]
            );
        }


        // ==========================================
        // CHECK PASSWORD
        // ==========================================

        const valid = await bcrypt.compare(
            password,
            user.password
        );

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password."
            });
        }


        // ==========================================
        // CREATE JWT
        // ==========================================

        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET is missing.");

            return res.status(500).json({
                success: false,
                message: "Server authentication configuration is missing."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );


        // ==========================================
        // SUCCESS
        // ==========================================

        return res.json({
            success: true,
            token,

            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {

        console.error("❌ LOGIN ERROR:");
        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message || "Login failed."
        });
    }
};