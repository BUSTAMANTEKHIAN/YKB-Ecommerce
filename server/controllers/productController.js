const db = require("../config/db");

// ===========================
// GET ALL PRODUCTS
// ===========================
exports.getProducts = async (req, res) => {
    try {

        const [products] = await db.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json(products);

    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
};

// ===========================
// ADD PRODUCT
// ===========================
exports.addProduct = async (req, res) => {

    try {

        const {
            name,
            brand,
            category,
            description,
            price,
            stock,
            image
        } = req.body;

        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: "Name and price are required."
            });
        }

        await db.query(
            `INSERT INTO products
            (name, brand, category, description, price, stock, image)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                brand,
                category,
                description,
                price,
                stock,
                image
            ]
        );

        res.json({
            success: true,
            message: "Product added successfully!"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Unable to load this product right now." });
    }

};


exports.getProductById = async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(
            "SELECT * FROM products WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({ success: false, message: "Unable to add this product right now." });

    }

};

// ===========================
// UPDATE PRODUCT
// ===========================
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            brand,
            category,
            description,
            price,
            stock,
            image
        } = req.body;

        await db.query(
            `UPDATE products
             SET name = ?,
                 brand = ?,
                 category = ?,
                 description = ?,
                 price = ?,
                 stock = ?,
                 image = ?
             WHERE id = ?`,
            [
                name,
                brand,
                category,
                description,
                price,
                stock,
                image,
                id
            ]
        );

        res.json({
            success: true,
            message: "Product updated successfully!"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Unable to update this product right now." });
    }
};

// ===========================
// DELETE PRODUCT
// ===========================
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            "DELETE FROM products WHERE id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Product deleted successfully!"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Unable to delete this product right now." });
    }
};
