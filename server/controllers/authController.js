

const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });
        }

        const [existing] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users(fullname,email,password) VALUES(?,?,?)",
            [fullname, email, hashedPassword]
        );

        res.json({
            success: true,
            message: "Registration successful!"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};


// LOGIN
// LOGIN
exports.login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const [result] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (result.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result[0];

        // =========================
        // CHECK IF USER IS SUSPENDED
        // =========================
        if (user.suspended_until) {

            // Permanent ban
            if (user.suspended_until === "9999-12-31 23:59:59") {
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
                    message: `Your account is suspended until ${suspendedUntil.toLocaleString()}.`
                });
            }

            // Suspension expired
            await db.query(
                "UPDATE users SET suspended_until = NULL, suspension_reason = NULL WHERE id = ?",
                [user.id]
            );

        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
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

        console.error(err);

        res.status(500).json(err);

    }

};