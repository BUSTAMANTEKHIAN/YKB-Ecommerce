const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../config/db");

// =====================================================
// PAYMONGO WEBHOOK SIGNATURE VERIFICATION
// =====================================================

function verifyPayMongoSignature(rawBody, signatureHeader) {
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("❌ PAYMONGO_WEBHOOK_SECRET is missing.");
        return false;
    }

    if (!signatureHeader) {
        console.error("❌ PayMongo signature header is missing.");
        return false;
    }

    const parts = {};
    signatureHeader.split(",").forEach(part => {
        const [key, value] = part.split("=");
        if (key && value) {
            parts[key.trim()] = value.trim();
        }
    });

    const timestamp = parts.t;
    const testSignature = parts.te;
    const liveSignature = parts.li;

    if (!timestamp) {
        console.error("❌ PayMongo webhook timestamp missing.");
        return false;
    }

    // Validate timestamp tolerance: payload must be within 300 seconds (5 minutes)
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) {
        console.error("❌ PayMongo webhook timestamp is invalid.");
        return false;
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (Math.abs(currentEpoch - timestampNumber) > 300) {
        console.error("❌ PayMongo webhook timestamp expired / outside tolerance window.");
        return false;
    }

    // PayMongo signs: timestamp + "." + raw request body
    const signedPayload = `${timestamp}.${rawBody}`;

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(signedPayload)
        .digest("hex");

    const receivedSignature = liveSignature || testSignature;

    if (!receivedSignature) {
        console.error("❌ PayMongo webhook signature missing.");
        return false;
    }

    try {
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, "utf8"),
            Buffer.from(receivedSignature, "utf8")
        );
    } catch {
        return false;
    }
}

// =====================================================
// PAYMONGO WEBHOOK HANDLER
// POST /api/paymongo/webhook
// =====================================================

router.post("/webhook", async (req, res) => {
    try {
        const rawBody = req.body ? req.body.toString("utf8") : "";
        const signature = req.headers["paymongo-signature"];

        // -------------------------------------------------
        // VERIFY SIGNATURE
        // -------------------------------------------------
        const isValid = verifyPayMongoSignature(rawBody, signature);
        if (!isValid) {
            console.error("❌ Invalid PayMongo webhook signature.");
            return res.status(401).json({
                success: false,
                message: "Invalid webhook signature."
            });
        }

        // -------------------------------------------------
        // PARSE EVENT
        // -------------------------------------------------
        let event;
        try {
            event = JSON.parse(rawBody);
        } catch (jsonErr) {
            console.error("❌ Failed to parse webhook JSON payload:", jsonErr.message);
            return res.status(400).json({ success: false, message: "Invalid JSON." });
        }

        const eventType = event?.data?.attributes?.type;
        console.log(`🔔 PayMongo Webhook Event: ${eventType}`);

        const checkoutSession = event?.data?.attributes?.data;
        const sessionAttributes = checkoutSession?.attributes || {};
        const sessionId = checkoutSession?.id;

        const orderId =
            sessionAttributes.reference_number ||
            sessionAttributes.metadata?.order_id;

        if (!orderId) {
            console.warn("⚠️ No reference_number or metadata.order_id in PayMongo event.");
            return res.json({ received: true });
        }

        // -------------------------------------------------
        // HANDLE PAYMENT PAID
        // -------------------------------------------------
        if (eventType === "checkout_session.payment.paid") {
            let connection;
            try {
                connection = await db.getConnection();
                await connection.beginTransaction();

                const [orders] = await connection.query(
                    `SELECT id, order_id, user_id, total, payment_status, status
                     FROM orders
                     WHERE order_id = ?
                     FOR UPDATE`,
                    [orderId]
                );

                if (!orders.length) {
                    await connection.rollback();
                    console.warn(`⚠️ Webhook order not found in database: ${orderId}`);
                    return res.json({ received: true });
                }

                const order = orders[0];

                // Idempotency: avoid double-processing if already marked Paid
                if (order.payment_status === "Paid") {
                    await connection.rollback();
                    console.log(`ℹ️ Order ${orderId} is already marked as Paid (idempotent).`);
                    return res.json({ received: true, success: true });
                }

                // Verify paid amount and currency
                const payments = Array.isArray(sessionAttributes.payments) ? sessionAttributes.payments : [];
                const successfulPayment = payments.find(p => p?.attributes?.status === "paid") || payments[0];
                const paidAmount = successfulPayment?.attributes?.amount;
                const paidCurrency = successfulPayment?.attributes?.currency || "PHP";
                const expectedCents = Math.round(Number(order.total) * 100);

                if (paidAmount != null && (Number(paidAmount) !== expectedCents || paidCurrency.toUpperCase() !== "PHP")) {
                    await connection.rollback();
                    console.error(`❌ Payment amount mismatch for ${orderId}: expected ${expectedCents} PHP cents, received ${paidAmount} ${paidCurrency}`);
                    return res.status(400).json({
                        success: false,
                        message: "Amount or currency mismatch."
                    });
                }

                // Deduct stock for all order items
                const [items] = await connection.query(
                    `SELECT product_name, quantity FROM order_items WHERE order_id = ?`,
                    [orderId]
                );

                for (const item of items) {
                    await connection.query(
                        `UPDATE products
                         SET stock = GREATEST(0, stock - ?)
                         WHERE name = ?`,
                        [Number(item.quantity) || 1, item.product_name]
                    );
                }

                // Update order to Paid and Processing
                await connection.query(
                    `UPDATE orders
                     SET payment_status = 'Paid',
                         status = 'Processing'
                     WHERE order_id = ?`,
                    [orderId]
                );

                // Clear customer's cart now that payment is confirmed
                if (order.user_id) {
                    await connection.query(
                        "DELETE FROM cart WHERE user_id = ?",
                        [order.user_id]
                    );
                }

                await connection.commit();
                console.log(`✅ Order ${orderId} successfully marked Paid and stock deducted.`);
                return res.json({ received: true, success: true });

            } catch (txError) {
                if (connection) {
                    try { await connection.rollback(); } catch {}
                }
                throw txError;
            } finally {
                if (connection) connection.release();
            }
        }

        // -------------------------------------------------
        // HANDLE SESSION EXPIRED OR FAILED
        // -------------------------------------------------
        if (eventType === "checkout_session.expired") {
            let connection;
            try {
                connection = await db.getConnection();
                await connection.beginTransaction();

                const [orders] = await connection.query(
                    "SELECT order_id, payment_status, status FROM orders WHERE order_id = ? FOR UPDATE",
                    [orderId]
                );

                if (orders.length > 0) {
                    const order = orders[0];
                    // NEVER downgrade a successfully paid order
                    if (order.payment_status !== "Paid" && order.status === "Pending") {
                        await connection.query(
                            "UPDATE orders SET status = 'Cancelled' WHERE order_id = ?",
                            [orderId]
                        );
                        console.log(`ℹ️ Order ${orderId} marked Cancelled due to expired PayMongo checkout session.`);
                    }
                }

                await connection.commit();
            } catch (err) {
                if (connection) {
                    try { await connection.rollback(); } catch {}
                }
                console.error("❌ Error handling expired checkout session:", err);
            } finally {
                if (connection) connection.release();
            }
        }

        return res.json({ received: true });

    } catch (error) {
        console.error("❌ PayMongo webhook error:", error);
        return res.status(500).json({ success: false, message: "Webhook processing error." });
    }
});

module.exports = router;