const express = require("express");
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

// =====================================================
// CHECKOUT
// POST /api/orders/checkout
// =====================================================

router.post("/checkout", async (req, res) => {

    const { payment_method, shipping_info: shippingInfo } = req.body;
    const user_id = req.user.id;

    // -------------------------------------------------
    // BASIC VALIDATION
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

    const allowedPaymentMethods = [
        "COD",
        "GCash",
        "Card",
        "QRPh"
    ];

    if (!allowedPaymentMethods.includes(payment_method)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment method."
        });
    }

    // -------------------------------------------------
    // DATABASE CONNECTION
    // -------------------------------------------------

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        // -------------------------------------------------
        // VERIFY USER
        // -------------------------------------------------

        const [users] = await connection.query(
            "SELECT id FROM users WHERE id = ? LIMIT 1",
            [user_id]
        );

        if (users.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }

        // Keep the customer's default delivery address for their next order.
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

        // Use the authenticated user's cart as the source of the order.
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

                return res.status(400).json({
                    success: false,
                    message: "Invalid product or quantity."
                });

            }

            const [products] = await connection.query(
                `SELECT
                    id,
                    name,
                    price,
                    stock,
                    image,
                    category
                 FROM products
                 WHERE id = ?
                 LIMIT 1 FOR UPDATE`,
                [productId]
            );

            if (products.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: `Product ${productId} was not found.`
                });

            }

            const product = products[0];
            const size = isAccessory(product.category) ? null : (item.size || null);

            if (!isAccessory(product.category) && !size) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `Please select a size for ${product.name}.`
                });
            }

            // -------------------------------------------------
            // CHECK STOCK
            // -------------------------------------------------

            if (Number(product.stock) < quantity) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `${product.name} does not have enough stock.`
                });

            }

            // IMPORTANT:
            // Always use database price.

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

        // -------------------------------------------------
        // ROUND TOTAL
        // -------------------------------------------------

        total = Number(total.toFixed(2));

        // -------------------------------------------------
        // CREATE YKB ORDER ID
        // -------------------------------------------------

        const orderId = `YKB-${Date.now()}`;

        // -------------------------------------------------
        // CREATE ORDER
        // -------------------------------------------------

        await connection.query(
            `INSERT INTO orders
                (
                    order_id,
                    user_id,
                    total,
                    payment_method,
                    payment_status,
                    shipping_name,
                    shipping_email,
                    shipping_phone,
                    shipping_address,
                    shipping_city,
                    shipping_postal_code
                )
             VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderId,
                user_id,
                total,
                payment_method,
                "Pending",
                shippingInfo.fullName.trim(),
                shippingInfo.email.trim().toLowerCase(),
                shippingInfo.phone.trim(),
                shippingInfo.address.trim(),
                shippingInfo.city.trim(),
                shippingInfo.postalCode.trim()
            ]
        );

        // -------------------------------------------------
        // INSERT ORDER ITEMS + REDUCE STOCK
        // -------------------------------------------------

        for (const item of verifiedItems) {

            await connection.query(
                `INSERT INTO order_items
                    (
                        order_id,
                        product_name,
                        size,
                        price,
                        quantity,
                        subtotal
                    )
                 VALUES
                    (?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_name,
                    item.size,
                    item.price,
                    item.quantity,
                    item.subtotal
                ]
            );

            const [stockUpdate] = await connection.query(
                `UPDATE products
                 SET stock = stock - ?
                 WHERE id = ?
                   AND stock >= ?`,
                [
                    item.quantity,
                    item.product_id,
                    item.quantity
                ]
            );
            if (!stockUpdate.affectedRows) {
                await connection.rollback();
                return res.status(409).json({ success: false, message: `${item.product_name} stock changed. Please review your cart.` });
            }

        }

        // =================================================
        // CASH ON DELIVERY
        // =================================================

        if (payment_method === "COD") {

            await connection.query(
                "DELETE FROM cart WHERE user_id = ?",
                [user_id]
            );

            await connection.commit();

            console.log(
                `📦 COD Order Created: ${orderId}`
            );

            return res.json({
                success: true,
                payment_required: false,
                order_id: orderId,
                payment_method: "COD",
                payment_status: "Pending",
                total: total
            });

        }

        // =================================================
        // PAYMONGO CHECKOUT
        // =================================================

        const secretKey =
            process.env.PAYMONGO_SECRET_KEY;

        if (!secretKey) {

            await connection.rollback();

            return res.status(500).json({
                success: false,
                message: "PayMongo secret key is not configured."
            });

        }

        // -------------------------------------------------
        // PAYMONGO PAYMENT METHOD
        // -------------------------------------------------

        const paymongoMethodMap = {

            GCash: "gcash",

            Card: "card",

            QRPh: "qrph"

        };

        const paymongoPaymentMethod =
            paymongoMethodMap[payment_method];

        // -------------------------------------------------
        // CREATE PAYMONGO LINE ITEMS
        // -------------------------------------------------

        const lineItems =
            verifiedItems.map(item => ({

                name: item.product_name,

                amount: Math.round(
                    item.price * 100
                ),

                currency: "PHP",

                quantity: item.quantity

            }));

        // -------------------------------------------------
        // APP URL
        // -------------------------------------------------

        const appUrl =
            process.env.APP_URL ||
            "http://localhost:3000";

        // -------------------------------------------------
        // CREATE PAYMONGO CHECKOUT SESSION
        // -------------------------------------------------

        const paymongoResponse =
            await fetch(
                "https://api.paymongo.com/v2/checkout_sessions",
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Basic ${Buffer
                                .from(`${secretKey}:`)
                                .toString("base64")}`,

                        "Idempotency-Key":
                            orderId

                    },

                    body: JSON.stringify({

                        data: {

                            attributes: {

                                line_items:
                                    lineItems,

                                payment_method_types: [
                                    paymongoPaymentMethod
                                ],

                                success_url:
                                    `${appUrl}/order-success.html?order_id=${encodeURIComponent(orderId)}`,

                                cancel_url:
                                    `${appUrl}/checkout.html`,

                                reference_number:
                                    orderId,

                                send_email_receipt:
                                    false,

                                metadata: {

                                    order_id:
                                        orderId,

                                    user_id:
                                        String(user_id)

                                }

                            }

                        }

                    })

                }
            );

        const paymongoData =
            await paymongoResponse.json();

        // -------------------------------------------------
        // PAYMONGO ERROR
        // -------------------------------------------------

        if (!paymongoResponse.ok) {

            const providerErrorCodes = Array.isArray(paymongoData?.errors)
                ? paymongoData.errors.map(error => error.code).filter(Boolean)
                : [];
            console.error("PayMongo checkout failed:", providerErrorCodes.join(", ") || "provider error");

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Unable to create PayMongo checkout. Please try again or choose another payment method."
            });

        }

        // -------------------------------------------------
        // GET CHECKOUT URL
        // -------------------------------------------------

        const checkoutUrl =
            paymongoData
                ?.data
                ?.attributes
                ?.checkout_url;

        if (!checkoutUrl) {

            console.error(
                "❌ PayMongo did not return checkout_url:",
                paymongoData
            );

            await connection.rollback();

            return res.status(500).json({

                success: false,

                message:
                    "PayMongo did not return a checkout URL."

            });

        }

        // -------------------------------------------------
        // CLEAR CART
        // -------------------------------------------------

        await connection.query(
            "DELETE FROM cart WHERE user_id = ?",
            [user_id]
        );

        // -------------------------------------------------
        // COMMIT DATABASE CHANGES
        // -------------------------------------------------

        await connection.commit();

        console.log(
            `💳 PayMongo Checkout Created: ${orderId}`
        );

        console.log(
            `💰 Total: ₱${total.toFixed(2)}`
        );

        // -------------------------------------------------
        // SEND CHECKOUT URL
        // -------------------------------------------------

        return res.json({

            success: true,

            payment_required: true,

            order_id: orderId,

            payment_method:
                payment_method,

            payment_status:
                "Pending",

            total: total,

            checkout_url:
                checkoutUrl

        });

    } catch (error) {

        console.error(
            "❌ Checkout Error:",
            error
        );

        if (connection) {

            try {

                await connection.rollback();

            } catch (rollbackError) {

                console.error(
                    "❌ Rollback Error:",
                    rollbackError
                );

            }

        }

        return res.status(500).json({

            success: false,

            message:
                "Something went wrong while processing your order.",

        });

    } finally {

        if (connection) {
            connection.release();
        }

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
                orders.order_id,
                orders.total,
                orders.status,
                orders.payment_method,
                orders.payment_status,
                orders.created_at,
                orders.shipping_name,
                orders.shipping_email,
                orders.shipping_phone,
                orders.shipping_address,
                orders.shipping_city,
                orders.shipping_postal_code,
                users.fullname,
                users.email

             FROM orders

             LEFT JOIN users
                ON orders.user_id = users.id

             ORDER BY orders.created_at DESC`

        );

        res.json(orders);

    } catch (error) {

        console.error(
            "❌ Admin Get Orders Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load admin orders."

        });

    }

});



// =====================================================
// ADMIN - GET SINGLE ORDER
// GET /api/orders/admin/:order_id
// =====================================================

router.get("/admin/:order_id", async (req, res) => {

    try {

        const { order_id } = req.params;

        // -------------------------------------------------
        // GET ORDER
        // -------------------------------------------------

        const [orderRows] = await db.query(

            `SELECT
                orders.order_id,
                orders.user_id,
                orders.total,
                orders.payment_method,
                orders.payment_status,
                orders.status,
                orders.created_at,
                orders.shipping_name,
                orders.shipping_email,
                orders.shipping_phone,
                orders.shipping_address,
                orders.shipping_city,
                orders.shipping_postal_code,
                users.fullname,
                users.email

             FROM orders

             LEFT JOIN users
                ON orders.user_id = users.id

             WHERE orders.order_id = ?

             LIMIT 1`,

            [order_id]

        );

        if (orderRows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."

            });

        }

        // -------------------------------------------------
        // GET ORDER ITEMS
        // -------------------------------------------------

        const [items] = await db.query(

            `SELECT
                order_id,
                product_name,
                size,
                price,
                quantity,
                subtotal

             FROM order_items

             WHERE order_id = ?`,

            [order_id]

        );

        res.json({

            success: true,

            order:
                orderRows[0],

            items:
                items

        });

    } catch (error) {

        console.error(
            "❌ Admin Get Order Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load order details."

        });

    }

});



// =====================================================
// ADMIN - UPDATE ORDER STATUS
// PUT /api/orders/admin/:order_id/status
// =====================================================

router.put("/admin/:order_id/status", async (req, res) => {

    try {

        const { order_id } = req.params;

        const { status } = req.body;

        // -------------------------------------------------
        // VALID STATUSES
        // -------------------------------------------------

        const allowedStatuses = [

            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"

        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order status."

            });

        }

        // -------------------------------------------------
        // CHECK ORDER
        // -------------------------------------------------

        const [existingOrders] = await db.query(

            `SELECT
                order_id,
                status

             FROM orders

             WHERE order_id = ?

             LIMIT 1`,

            [order_id]

        );

        if (existingOrders.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."

            });

        }

        // -------------------------------------------------
        // UPDATE STATUS
        // -------------------------------------------------

        await db.query(

            `UPDATE orders

             SET status = ?

             WHERE order_id = ?`,

            [
                status,
                order_id
            ]

        );

        console.log(
            `📦 Order ${order_id} status updated to ${status}`
        );

        res.json({

            success: true,

            message:
                "Order status updated successfully.",

            order_id:
                order_id,

            status:
                status

        });

    } catch (error) {

        console.error(
            "❌ Update Order Status Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to update order status."

        });

    }

});



// =====================================================
// USER - GET OWN RECEIPT
router.get("/receipt/:order_id", async (req, res) => {
    try {
        const [orders] = await db.query(
            "SELECT order_id, user_id, total, payment_method, payment_status, status, created_at FROM orders WHERE order_id = ? AND user_id = ? LIMIT 1",
            [req.params.order_id, req.user.id]
        );
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

// USER - GET OWN ORDERS
// GET /api/orders/:user_id
// =====================================================

router.get("/:user_id", async (req, res) => {

    try {

        const user_id = req.user.id;

        const [orders] = await db.query(

            `SELECT
                order_id,
                user_id,
                total,
                payment_method,
                payment_status,
                status,
                created_at

             FROM orders

             WHERE user_id = ?

             ORDER BY created_at DESC`,

            [user_id]

        );

        res.json(orders);

    } catch (error) {

        console.error(
            "❌ Get User Orders Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load orders"

        });

    }

});



// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;
