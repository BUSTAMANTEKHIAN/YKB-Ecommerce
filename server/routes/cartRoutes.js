const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticate = require("../middleware/authMiddleware");
router.use(authenticate);

const isAccessory = (category) => {
    const normalized = String(category || "").trim().toLowerCase();
    return normalized === "accessory" || normalized === "accessories";
};


// ➕ ADD TO CART (auto merge quantity if exists)
router.post("/add", async (req, res) => {
    try {
        const {
            product_id,
            size,
            quantity
        } = req.body;

        const productId = Number(product_id);
        const requestedQuantity = Number(quantity);
        if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 99) {
            return res.status(400).json({ success: false, message: "Choose a valid product quantity." });
        }

        const [products] = await db.query(
            "SELECT id, name, price, image, category, stock FROM products WHERE id = ? LIMIT 1",
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        const product = products[0];
        const cartSize = isAccessory(product.category) ? null : (String(size || "").trim() || null);

        if (cartSize && (!/^[\p{L}\d -]{1,20}$/u.test(cartSize))) {
            return res.status(400).json({ success: false, message: "Choose a valid size." });
        }

        if (!isAccessory(products[0].category) && !cartSize) {
            return res.status(400).json({ success: false, message: "Please select a size." });
        }

        if (requestedQuantity > Number(product.stock)) {
            return res.status(400).json({ success: false, message: `Only ${Number(product.stock)} item(s) are available.` });
        }

        // check if item already exists
        const checkSql = `
            SELECT * FROM cart
            WHERE product_id = ? AND size <=> ? AND user_id = ?
        `;

        const [existing] = await db.query(checkSql, [
            product_id,
            cartSize,
            req.user.id
        ]);

        if (existing.length > 0) {
            if (Number(existing[0].quantity) + requestedQuantity > Number(product.stock)) {
                return res.status(400).json({ success: false, message: `Only ${Number(product.stock)} item(s) are available.` });
            }
            const updateSql = `
                UPDATE cart
                SET quantity = quantity + ?
                WHERE product_id = ? AND size <=> ? AND user_id = ?
            `;
                    
            await db.query(updateSql, [
                requestedQuantity,
                product_id,
                cartSize,
                req.user.id
            ]);

            return res.json({ success: true, message: "Cart updated (quantity increased)" });
        }

        const insertSql = `
        INSERT INTO cart
        (product_id, product_name, price, image, size, quantity, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(insertSql, [
            product_id,
            product.name,
            product.price,
            product.image,
            cartSize,
            requestedQuantity,
            req.user.id
        ]);

        res.json({ success: true, message: "Product added successfully!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// GET CART
router.get("/:userId", async (req, res) => {
    try {
        const userId = req.user.id;

        const [results] = await db.query(
            `SELECT cart.*, products.category,
                    products.name AS current_name,
                    products.price AS current_price,
                    products.image AS current_image,
                    products.stock AS current_stock
             FROM cart
             LEFT JOIN products ON products.id = cart.product_id
             WHERE cart.user_id = ?`,
            [userId]
        );

        // Hide stale sizes on older accessory cart rows without rewriting
        // historical cart data. New accessory rows are stored as NULL above.
        const items = results.map(item => ({
            ...item,
            product_name: item.current_name || item.product_name,
            price: item.current_price == null ? item.price : item.current_price,
            image: item.current_image || item.image,
            size: isAccessory(item.category) ? null : item.size
        }));

        const total = items.reduce((sum, item) => {
            return sum + Number(item.price) * Number(item.quantity);
        }, 0);

        res.json({
            items,
            total
        });

    } catch (err) {
        console.error("GET CART ERROR:", err);
        res.status(500).json({ items: [], total: 0 });
    }
});

// UPDATE QTY
router.put("/update/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const quantity = Number(req.body.quantity);
        if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return res.status(400).json({ success: false, message: "Choose a valid quantity." });
        }

        const [items] = await db.query(
            `SELECT cart.id, products.stock FROM cart
             JOIN products ON products.id = cart.product_id
             WHERE cart.id = ? AND cart.user_id = ? LIMIT 1`,
            [id, req.user.id]
        );
        if (!items.length) return res.status(404).json({ success: false, message: "Cart item not found." });
        if (quantity > Number(items[0].stock)) return res.status(400).json({ success: false, message: `Only ${Number(items[0].stock)} item(s) are available.` });
        const [result] = await db.query("UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?", [quantity, id, req.user.id]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Cart item not found." });
        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// REMOVE ITEM
router.delete("/remove/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [result] = await db.query(
            "DELETE FROM cart WHERE id = ? AND user_id = ?",
            [id, req.user.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Cart item not found." });

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
