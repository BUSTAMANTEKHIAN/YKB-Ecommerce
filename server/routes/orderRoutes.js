const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../config/db");
const authenticate = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

router.use(authenticate);
router.use("/admin", requireAdmin);

const isAccessory = (category) => {
    const normalized = String(category || "").trim().toLowerCase();
    return normalized === "accessory" || normalized === "accessories";
};

// Graceful helper for checkout_session_id (in case migration 004 is pending)
async function saveCheckoutSessionId(poolOrConn, orderId, sessionId) {
    try {
        await poolOrConn.query(
            "UPDATE orders SET checkout_session_id = ? WHERE order_id = ?",
            [sessionId, orderId]
        );
    } catch (err) {
        if (err.code === "ER_BAD_FIELD_ERROR") {
            console.warn("⚠️ orders.checkout_session_id column does not exist yet. Run migration 004.");
        } else {
            console.error("Failed to update checkout_session_id:", err.message);
        }
    }
}

// =====================================================
// CHECKOUT
// POST /api/orders/checkout
// =====================================================
router.post("/checkout", async (req, res) => {
    const { payment_method, shipping_info: shippingInfo } = req.body;
    const user_id = req.user.id;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------
    const maxShippingLengths = { fullName: 200, email: 254, phone: 25, address: 500, city: 200, postalCode: 20 };
    const requiredShipping = Object.keys(maxShippingLengths);
    if (!shippingInfo || requiredShipping.some(key => typeof shippingInfo[key] !== "string" || !shippingInfo[key].trim() || shippingInfo[key].length > maxShippingLengths[key]) ||
        typeof shippingInfo.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email) || shippingInfo.email.length > 254) {
        return res.status(400).json({ success: false, message: "Enter a valid name, email, phone, address, city/province, and postal code." });
    }
    if (!/^[+\d() .-]{7,25}$/.test(shippingInfo.phone.trim())) {
        return res.status(400).json({ success: false, message: "Enter a valid phone number." });
    }

    const allowedPaymentMethods = ["COD", "GCash", "Card", "QRPh"];
    if (!allowedPaymentMethods.includes(payment_method)) {
        return res.status(400).json({ success: false, message: "Invalid payment method." });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Verify user exists
        const [users] = await connection.query(
            "SELECT id FROM users WHERE id = ? LIMIT 1",
            [user_id]
        );
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Save default delivery address for future orders
        await connection.query(
            `UPDATE users
             SET phone = ?, address = ?, city = ?, postal_code = ?
             WHERE id = ?`,
            [
                shippingInfo.phone.trim(),
                shippingInfo.address.trim(),
                shippingInfo.city.trim(),
                shippingInfo.postalCode.trim(),
                user_id
            ]
        );

        // Fetch user's cart rows with row lock
        const [cartRows] = await connection.query(
            "SELECT product_id, size, quantity FROM cart WHERE user_id = ? FOR UPDATE",
            [user_id]
        );
        if (!cartRows.length) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "Your cart is empty." });
        }

        const verifiedItems = [];
        let total = 0;

        for (const item of cartRows) {
            const productId = Number(item.product_id);
            const quantity = Number(item.quantity);

            if (!productId || !quantity || quantity < 1) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: "Invalid product or quantity in cart." });
            }

            const [products] = await connection.query(
                `SELECT id, name, price, stock, image, category
                 FROM products
                 WHERE id = ?
                 LIMIT 1 FOR UPDATE`,
                [productId]
            );

            if (products.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: `Product ${productId} was not found.` });
            }

            const product = products[0];
            const size = isAccessory(product.category) ? null : (item.size || null);

            if (!isAccessory(product.category) && !size) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: `Please select a size for ${product.name}.` });
            }

            if (Number(product.stock) < quantity) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: `${product.name} does not have enough stock available.` });
            }

            const price = Number(product.price);
            const subtotal = price * quantity;
            total += subtotal;

            verifiedItems.push({
                product_id: product.id,
                product_name: product.name,
                price: price,
                quantity: quantity,
                subtotal: subtotal,
                image: product.image,
                size: size
            });
        }

        total = Number(total.toFixed(2));

        // Generate collision-resistant order ID
        const orderId = `YKB-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        // Insert into orders table
        await connection.query(
            `INSERT INTO orders
                (
                    order_id, user_id, total, payment_method, payment_status, status,
                    shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_postal_code
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderId,
                user_id,
                total,
                payment_method,
                "Pending",
                payment_method === "COD" ? "Processing" : "Pending",
                shippingInfo.fullName.trim(),
                shippingInfo.email.trim().toLowerCase(),
                shippingInfo.phone.trim(),
                shippingInfo.address.trim(),
                shippingInfo.city.trim(),
                shippingInfo.postalCode.trim()
            ]
        );

        // Insert order items
        for (const item of verifiedItems) {
            await connection.query(
                `INSERT INTO order_items (order_id, product_name, size, price, quantity, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_name, item.size, item.price, item.quantity, item.subtotal]
            );
        }

        // -------------------------------------------------
        // COD FLOW: Deduct stock & clear cart immediately
        // -------------------------------------------------
        if (payment_method === "COD") {
            for (const item of verifiedItems) {
                const [stockUpdate] = await connection.query(
                    `UPDATE products
                     SET stock = stock - ?
                     WHERE id = ? AND stock >= ?`,
                    [item.quantity, item.product_id, item.quantity]
                );
                if (!stockUpdate.affectedRows) {
                    await connection.rollback();
                    return res.status(409).json({ success: false, message: `${item.product_name} stock changed. Please review your cart.` });
                }
            }

            await connection.query("DELETE FROM cart WHERE user_id = ?", [user_id]);
            await connection.commit();

            console.log(`📦 COD Order Placed: ${orderId}`);
            return res.json({
                success: true,
                payment_required: false,
                order_id: orderId,
                payment_method: "COD",
                payment_status: "Pending",
                total: total
            });
        }

        // -------------------------------------------------
        // ONLINE PAYMENT FLOW: Approach A
        // Commit DB transaction FIRST (releases row locks!),
        // then initiate PayMongo session outside the transaction.
        // Stock and cart remain intact until webhook confirms payment.
        // -------------------------------------------------
        await connection.commit();
        connection.release();
        connection = null;

        const secretKey = process.env.PAYMONGO_SECRET_KEY;
        if (!secretKey) {
            // Delete pending order if gateway key is not configured
            await db.query("DELETE FROM orders WHERE order_id = ?", [orderId]);
            return res.status(500).json({ success: false, message: "PayMongo secret key is not configured." });
        }

        const paymongoMethodMap = {
            GCash: "gcash",
            Card: "card",
            QRPh: "qrph"
        };
        const paymongoPaymentMethod = paymongoMethodMap[payment_method];

        const lineItems = verifiedItems.map(item => ({
            name: item.product_name,
            amount: Math.round(item.price * 100),
            currency: "PHP",
            quantity: item.quantity
        }));

        const appUrl = process.env.APP_URL || "http://localhost:3000";

        // Call PayMongo API outside database transaction
        const paymongoResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
                "Idempotency-Key": orderId
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        line_items: lineItems,
                        payment_method_types: [paymongoPaymentMethod],
                        success_url: `${appUrl}/order-success.html?order_id=${encodeURIComponent(orderId)}`,
                        cancel_url: `${appUrl}/checkout.html?cancelled=true&order_id=${encodeURIComponent(orderId)}`,
                        reference_number: orderId,
                        send_email_receipt: false,
                        metadata: {
                            order_id: orderId,
                            user_id: String(user_id)
                        }
                    }
                }
            })
        });

        const paymongoData = await paymongoResponse.json();

        if (!paymongoResponse.ok) {
            const providerErrors = Array.isArray(paymongoData?.errors)
                ? paymongoData.errors.map(e => e.detail || e.code).join(", ")
                : "provider error";
            console.error("PayMongo session creation failed:", providerErrors);

            // Clean up pending order since checkout session creation failed
            await db.query("DELETE FROM orders WHERE order_id = ?", [orderId]);

            return res.status(400).json({
                success: false,
                message: "Unable to create online payment session. Please try again or choose Cash on Delivery."
            });
        }

        const checkoutUrl = paymongoData?.data?.attributes?.checkout_url;
        const sessionId = paymongoData?.data?.id;

        if (!checkoutUrl) {
            await db.query("DELETE FROM orders WHERE order_id = ?", [orderId]);
            return res.status(500).json({
                success: false,
                message: "Payment gateway did not return a checkout URL."
            });
        }

        // Persist checkout session ID
        if (sessionId) {
            await saveCheckoutSessionId(db, orderId, sessionId);
        }

        console.log(`💳 PayMongo Checkout Session Created: ${orderId} (Session: ${sessionId})`);

        return res.json({
            success: true,
            payment_required: true,
            order_id: orderId,
            payment_method: payment_method,
            payment_status: "Pending",
            total: total,
            checkout_url: checkoutUrl
        });

    } catch (error) {
        console.error("❌ Checkout Error:", error);
        if (connection) {
            try { await connection.rollback(); } catch {}
        }
        return res.status(500).json({
            success: false,
            message: "Something went wrong while processing your order."
        });
    } finally {
        if (connection) connection.release();
    }
});

// =====================================================
// RETRY ONLINE PAYMENT
// POST /api/orders/:order_id/retry-payment
// =====================================================
router.post("/:order_id/retry-payment", async (req, res) => {
    try {
        const { order_id: orderId } = req.params;
        const userId = req.user.id;

        const [orders] = await db.query(
            "SELECT * FROM orders WHERE order_id = ? AND user_id = ? LIMIT 1",
            [orderId, userId]
        );

        if (!orders.length) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const order = orders[0];

        if (order.payment_status === "Paid") {
            return res.status(400).json({ success: false, message: "This order has already been paid." });
        }

        if (order.status === "Cancelled") {
            return res.status(400).json({ success: false, message: "This order has been cancelled and cannot be paid." });
        }

        if (order.payment_method === "COD") {
            return res.status(400).json({ success: false, message: "Cash on delivery orders do not require online payment." });
        }

        // Verify items still have sufficient stock
        const [items] = await db.query(
            "SELECT product_name, quantity, price FROM order_items WHERE order_id = ?",
            [orderId]
        );

        for (const item of items) {
            const [products] = await db.query(
                "SELECT stock FROM products WHERE name = ? LIMIT 1",
                [item.product_name]
            );
            if (!products.length || Number(products[0].stock) < Number(item.quantity)) {
                return res.status(400).json({
                    success: false,
                    message: `${item.product_name} is no longer available in the requested quantity.`
                });
            }
        }

        const secretKey = process.env.PAYMONGO_SECRET_KEY;
        if (!secretKey) {
            return res.status(500).json({ success: false, message: "PayMongo secret key is not configured." });
        }

        const paymongoMethodMap = { GCash: "gcash", Card: "card", QRPh: "qrph" };
        const paymongoPaymentMethod = paymongoMethodMap[order.payment_method] || "gcash";

        const lineItems = items.map(item => ({
            name: item.product_name,
            amount: Math.round(Number(item.price) * 100),
            currency: "PHP",
            quantity: item.quantity
        }));

        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const retryKey = `${orderId}-retry-${Date.now()}`;

        const paymongoResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
                "Idempotency-Key": retryKey
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        line_items: lineItems,
                        payment_method_types: [paymongoPaymentMethod],
                        success_url: `${appUrl}/order-success.html?order_id=${encodeURIComponent(orderId)}`,
                        cancel_url: `${appUrl}/checkout.html?cancelled=true&order_id=${encodeURIComponent(orderId)}`,
                        reference_number: orderId,
                        send_email_receipt: false,
                        metadata: { order_id: orderId, user_id: String(userId) }
                    }
                }
            })
        });

        const paymongoData = await paymongoResponse.json();
        if (!paymongoResponse.ok) {
            return res.status(400).json({
                success: false,
                message: "Unable to create a new payment session. Please try again later."
            });
        }

        const checkoutUrl = paymongoData?.data?.attributes?.checkout_url;
        const sessionId = paymongoData?.data?.id;

        if (sessionId) {
            await saveCheckoutSessionId(db, orderId, sessionId);
        }

        return res.json({
            success: true,
            checkout_url: checkoutUrl,
            order_id: orderId
        });

    } catch (error) {
        console.error("❌ Retry Payment Error:", error);
        return res.status(500).json({ success: false, message: "Unable to retry payment right now." });
    }
});

// =====================================================
// CANCEL ORDER (USER OR ADMIN)
// POST /api/orders/:order_id/cancel
// =====================================================
router.post("/:order_id/cancel", async (req, res) => {
    let connection;
    try {
        const { order_id: orderId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [orders] = await connection.query(
            "SELECT * FROM orders WHERE order_id = ? FOR UPDATE",
            [orderId]
        );

        if (!orders.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const order = orders[0];

        // Non-admin users can only cancel their own orders
        if (userRole !== "admin" && userRole !== "owner" && Number(order.user_id) !== userId) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: "You are not authorized to cancel this order." });
        }

        if (order.status === "Cancelled") {
            await connection.rollback();
            return res.status(400).json({ success: false, message: "This order is already cancelled." });
        }

        if (order.status === "Shipped" || order.status === "Delivered") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Orders that are already ${order.status.toLowerCase()} cannot be cancelled.`
            });
        }

        // Restore stock if stock was deducted (i.e. if COD or if online order was Paid)
        if (order.payment_method === "COD" || order.payment_status === "Paid") {
            const [items] = await connection.query(
                "SELECT product_name, quantity FROM order_items WHERE order_id = ?",
                [orderId]
            );

            for (const item of items) {
                await connection.query(
                    `UPDATE products
                     SET stock = stock + ?
                     WHERE name = ?`,
                    [Number(item.quantity) || 1, item.product_name]
                );
            }
            console.log(`📦 Restored stock for cancelled order ${orderId}`);
        }

        await connection.query(
            "UPDATE orders SET status = 'Cancelled' WHERE order_id = ?",
            [orderId]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Order has been cancelled successfully.",
            order_id: orderId
        });

    } catch (error) {
        console.error("❌ Cancel Order Error:", error);
        if (connection) {
            try { await connection.rollback(); } catch {}
        }
        return res.status(500).json({ success: false, message: "Failed to cancel order." });
    } finally {
        if (connection) connection.release();
    }
});

// =====================================================
// USER - GET OWN RECEIPT
// GET /api/orders/receipt/:order_id
// =====================================================
router.get("/receipt/:order_id", async (req, res) => {
    try {
        const userRole = req.user.role;
        const isPrivileged = userRole === "admin" || userRole === "owner";

        const querySql = isPrivileged
            ? "SELECT * FROM orders WHERE order_id = ? LIMIT 1"
            : "SELECT * FROM orders WHERE order_id = ? AND user_id = ? LIMIT 1";
        const queryParams = isPrivileged ? [req.params.order_id] : [req.params.order_id, req.user.id];

        const [orders] = await db.query(querySql, queryParams);
        if (!orders.length) return res.status(404).json({ success: false, message: "Order not found." });

        const [items] = await db.query(
            `SELECT oi.product_name, oi.size, oi.price, oi.quantity, oi.subtotal,
                    (SELECT p.image FROM products p
                     WHERE p.name = oi.product_name
                     ORDER BY p.id ASC LIMIT 1) AS image
             FROM order_items oi
             WHERE oi.order_id = ?`,
            [orders[0].order_id]
        );

        return res.json({ order: orders[0], items });
    } catch (error) {
        console.error("Receipt lookup failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to load this receipt." });
    }
});

// =====================================================
// USER - GET OWN ORDERS
// GET /api/orders/my-orders OR GET /api/orders/:user_id
// =====================================================
router.get("/my-orders", async (req, res) => {
    try {
        const userId = req.user.id;
        const [orders] = await db.query(
            `SELECT order_id, user_id, total, payment_method, payment_status, status, created_at
             FROM orders
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json(orders);
    } catch (error) {
        console.error("❌ Get User Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to load orders." });
    }
});

router.get("/:user_id", async (req, res) => {
    try {
        // Enforce that customers can only view their own orders
        const userId = req.user.id;
        const [orders] = await db.query(
            `SELECT order_id, user_id, total, payment_method, payment_status, status, created_at
             FROM orders
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json(orders);
    } catch (error) {
        console.error("❌ Get User Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to load orders." });
    }
});

// =====================================================
// ADMIN - GET ALL ORDERS
// GET /api/orders/admin/all
// =====================================================
router.get("/admin/all", async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT
                orders.order_id, orders.total, orders.status, orders.payment_method, orders.payment_status,
                orders.created_at, orders.shipping_name, orders.shipping_email, orders.shipping_phone,
                orders.shipping_address, orders.shipping_city, orders.shipping_postal_code,
                users.fullname, users.email
             FROM orders
             LEFT JOIN users ON orders.user_id = users.id
             ORDER BY orders.created_at DESC`
        );
        res.json(orders);
    } catch (error) {
        console.error("❌ Admin Get Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to load admin orders." });
    }
});

// =====================================================
// ADMIN - GET SINGLE ORDER
// GET /api/orders/admin/:order_id
// =====================================================
router.get("/admin/:order_id", async (req, res) => {
    try {
        const { order_id } = req.params;
        const [orderRows] = await db.query(
            `SELECT
                orders.order_id, orders.user_id, orders.total, orders.payment_method, orders.payment_status,
                orders.status, orders.created_at, orders.shipping_name, orders.shipping_email,
                orders.shipping_phone, orders.shipping_address, orders.shipping_city, orders.shipping_postal_code,
                users.fullname, users.email
             FROM orders
             LEFT JOIN users ON orders.user_id = users.id
             WHERE orders.order_id = ?
             LIMIT 1`,
            [order_id]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const [items] = await db.query(
            `SELECT order_id, product_name, size, price, quantity, subtotal
             FROM order_items
             WHERE order_id = ?`,
            [order_id]
        );

        res.json({ success: true, order: orderRows[0], items });
    } catch (error) {
        console.error("❌ Admin Get Order Error:", error);
        res.status(500).json({ success: false, message: "Failed to load order details." });
    }
});

// =====================================================
// ADMIN - UPDATE ORDER STATUS
// PUT /api/orders/admin/:order_id/status
// =====================================================
router.put("/admin/:order_id/status", async (req, res) => {
    let connection;
    try {
        const { order_id } = req.params;
        const { status } = req.body;
        const allowedStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid order status." });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existingOrders] = await connection.query(
            "SELECT order_id, status, payment_method, payment_status FROM orders WHERE order_id = ? FOR UPDATE",
            [order_id]
        );

        if (existingOrders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const currentOrder = existingOrders[0];
        const previousStatus = currentOrder.status;

        // Exactly-once stock restoration when transitioning to Cancelled
        if (status === "Cancelled" && previousStatus !== "Cancelled") {
            if (currentOrder.payment_method === "COD" || currentOrder.payment_status === "Paid") {
                const [items] = await connection.query(
                    "SELECT product_name, quantity FROM order_items WHERE order_id = ?",
                    [order_id]
                );
                for (const item of items) {
                    await connection.query(
                        "UPDATE products SET stock = stock + ? WHERE name = ?",
                        [Number(item.quantity) || 1, item.product_name]
                    );
                }
                console.log(`📦 Admin cancelled: restored stock for order ${order_id}`);
            }
        }

        // Re-deduct stock if un-cancelling a previously cancelled order
        if (previousStatus === "Cancelled" && status !== "Cancelled") {
            if (currentOrder.payment_method === "COD" || currentOrder.payment_status === "Paid") {
                const [items] = await connection.query(
                    "SELECT product_name, quantity FROM order_items WHERE order_id = ?",
                    [order_id]
                );
                for (const item of items) {
                    await connection.query(
                        "UPDATE products SET stock = GREATEST(0, stock - ?) WHERE name = ?",
                        [Number(item.quantity) || 1, item.product_name]
                    );
                }
            }
        }

        await connection.query(
            "UPDATE orders SET status = ? WHERE order_id = ?",
            [status, order_id]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Order status updated successfully.",
            order_id: order_id,
            status: status
        });

    } catch (error) {
        console.error("❌ Update Order Status Error:", error);
        if (connection) {
            try { await connection.rollback(); } catch {}
        }
        res.status(500).json({ success: false, message: "Failed to update order status." });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
