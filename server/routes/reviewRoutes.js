const express = require("express");
const router = express.Router();
const db = require("../config/db");


// =========================
// GET ALL REVIEWS (ADMIN)
// =========================
router.get("/admin/all", async (req, res) => {

    try {

        const [reviews] = await db.query(
            `SELECT
                reviews.id,
                reviews.rating,
                reviews.review,
                reviews.created_at,
                products.name AS product_name,
                users.fullname
             FROM reviews
             JOIN products ON reviews.product_id = products.id
             JOIN users ON reviews.user_id = users.id
             ORDER BY reviews.created_at DESC`
        );

        res.json(reviews);

    } catch (err) {

        console.error(err);
        res.status(500).json([]);

    }

});

// =========================
// DELETE REVIEW (ADMIN)
// =========================
router.delete("/admin/:id", async (req, res) => {

    try {

        const { id } = req.params;

        await db.query(
            "DELETE FROM reviews WHERE id = ?",
            [id]
        );

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({
            success: false
        });

    }

});

// =========================
// GET REVIEWS FOR A PRODUCT
// =========================
router.get("/:productId", async (req, res) => {

    try {

        const { productId } = req.params;

        const [reviews] = await db.query(
            `SELECT
                reviews.id,
                reviews.rating,
                reviews.review,
                reviews.created_at,
                users.fullname
             FROM reviews
             JOIN users ON reviews.user_id = users.id
             WHERE reviews.product_id = ?
             ORDER BY reviews.created_at DESC`,
            [productId]
        );

        const [avg] = await db.query(
            "SELECT AVG(rating) AS average, COUNT(*) AS total FROM reviews WHERE product_id = ?",
            [productId]
        );

        res.json({
            average: avg[0].average || 0,
            total: avg[0].total || 0,
            reviews
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({
            average: 0,
            total: 0,
            reviews: []
        });

    }

});

// =========================
// ADD REVIEW
// =========================
router.post("/add", async (req, res) => {

    try {

        const {
            product_id,
            user_id,
            rating,
            review
        } = req.body;

        await db.query(
            "INSERT INTO reviews (product_id, user_id, rating, review) VALUES (?, ?, ?, ?)",
            [product_id, user_id, rating, review]
        );

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({
            success: false
        });

    }

});




module.exports = router;