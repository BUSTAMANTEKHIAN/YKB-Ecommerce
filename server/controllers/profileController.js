const db = require("../config/db");

const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPhone = value => /^[+\d() .-]{7,25}$/.test(value);

exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, fullname, email, phone, address, city, postal_code
             FROM users WHERE id = ? LIMIT 1`,
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "Account not found." });

        const profile = rows[0];
        res.json({
            success: true,
            profile: {
                id: profile.id,
                fullname: profile.fullname,
                email: profile.email,
                phone: profile.phone || "",
                address: profile.address || "",
                city: profile.city || "",
                postalCode: profile.postal_code || ""
            }
        });
    } catch (error) {
        console.error("Profile load failed:", error.code || "unexpected error");
        res.status(500).json({ success: false, message: "Unable to load your profile." });
    }
};

exports.updateProfile = async (req, res) => {
    const { fullname, email, phone = "", address = "", city = "", postalCode = "" } = req.body || {};
    const fields = { fullname, email, phone, address, city, postalCode };
    const limits = { fullname: 150, email: 150, phone: 25, address: 500, city: 200, postalCode: 20 };

    for (const [key, limit] of Object.entries(limits)) {
        if (typeof fields[key] !== "string" || fields[key].length > limit) {
            return res.status(400).json({ success: false, message: "Check the profile fields and try again." });
        }
    }
    if (!fullname.trim() || !validEmail(email.trim())) {
        return res.status(400).json({ success: false, message: "Enter your name and a valid email address." });
    }
    if (phone.trim() && !validPhone(phone.trim())) {
        return res.status(400).json({ success: false, message: "Enter a valid phone number." });
    }

    try {
        const [result] = await db.query(
            `UPDATE users
             SET fullname = ?, email = ?, phone = ?, address = ?, city = ?, postal_code = ?
             WHERE id = ?`,
            [fullname.trim(), email.trim().toLowerCase(), phone.trim(), address.trim(), city.trim(), postalCode.trim(), req.user.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Account not found." });

        res.json({
            success: true,
            profile: {
                id: req.user.id,
                fullname: fullname.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                address: address.trim(),
                city: city.trim(),
                postalCode: postalCode.trim()
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "That email address is already used by another account." });
        }
        console.error("Profile update failed:", error.code || "unexpected error");
        res.status(500).json({ success: false, message: "Unable to save your profile." });
    }
};
