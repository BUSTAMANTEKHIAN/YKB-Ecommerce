const express = require("express");
const router = express.Router();
const db = require("../config/db");

// =====================================================
// CHECKOUT
// POST /api/orders/checkout
// =====================================================

router.post("/checkout", async (req, res) => {

    const {
        user_id,
        payment_method,
        items
    } = req.body;

    // -------------------------------------------------
    // BASIC VALIDATION
    // -------------------------------------------------

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "User ID is required."
        });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Your cart is empty."
        });
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


        // -------------------------------------------------
        // GET REAL PRODUCTS FROM DATABASE
        // -------------------------------------------------

        const verifiedItems = [];

        let total = 0;

        for (const item of items) {

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
                `SELECT id, name, price, stock, image
                 FROM products
                 WHERE id = ?
                 LIMIT 1`,
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
            // Use database price, NOT item.price from browser.

            const price = Number(product.price);

            const subtotal = price * quantity;

            total += subtotal;


            verifiedItems.push({
                product_id: product.id,
                product_name: product.name,
                price: price,
                quantity: quantity,
                subtotal: subtotal,
                image: product.image
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
                (order_id, user_id, total, payment_method)
             VALUES
                (?, ?, ?, ?)`,
            [
                orderId,
                user_id,
                total,
                payment_method
            ]
        );


        // -------------------------------------------------
        // INSERT ORDER ITEMS + REDUCE STOCK
        // -------------------------------------------------

        for (const item of verifiedItems) {

            await connection.query(
                `INSERT INTO order_items
                    (order_id, product_name, price, quantity, subtotal)
                 VALUES
                    (?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_name,
                    item.price,
                    item.quantity,
                    item.subtotal
                ]
            );


            await connection.query(
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

            console.error(
                "❌ PayMongo Error:",
                JSON.stringify(
                    paymongoData,
                    null,
                    2
                )
            );


            // Rollback order + order items + stock
            await connection.rollback();


            return res.status(400).json({

                success: false,

                message:
                    "Unable to create PayMongo checkout.",

                error:
                    paymongoData

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
        // SEND CHECKOUT URL TO FRONTEND
        // -------------------------------------------------

        return res.json({

            success: true,

            payment_required: true,

            order_id: orderId,

            payment_method:
                payment_method,

            total: total,

            checkout_url:
                checkoutUrl

        });


    } catch (error) {

        console.error(
            "❌ Checkout Error:",
            error
        );


        // -------------------------------------------------
        // ROLLBACK DATABASE
        // -------------------------------------------------

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

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined

        });


    } finally {

        if (connection) {
            connection.release();
        }

    }

});

// GET /api/orders/:user_id
router.get("/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;

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
        console.error("❌ Get User Orders Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load orders"
        });
    }
});



module.exports = router;