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

    // PayMongo signs:
    // timestamp + "." + raw request body

    const signedPayload =
        `${timestamp}.${rawBody}`;

    const expectedSignature =
        crypto
            .createHmac("sha256", webhookSecret)
            .update(signedPayload)
            .digest("hex");

    const receivedSignature =
        liveSignature || testSignature;

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
// PAYMONGO WEBHOOK
// POST /api/paymongo/webhook
// =====================================================

router.post("/webhook", async (req, res) => {

    try {

        const rawBody = req.body.toString("utf8");

        const signature =
            req.headers["paymongo-signature"];

        // Verify PayMongo request
        const valid =
            verifyPayMongoSignature(
                rawBody,
                signature
            );

        if (!valid) {

            console.error(
                "❌ Invalid PayMongo webhook signature."
            );

            return res.status(401).json({
                success: false,
                message: "Invalid webhook signature."
            });

        }

        const event =
            JSON.parse(rawBody);

        console.log(
            "🔔 PayMongo Webhook:",
            event?.data?.attributes?.type
        );


        // =================================================
        // ONLY HANDLE SUCCESSFUL CHECKOUT
        // =================================================

        if (
            event?.data?.attributes?.type !==
            "checkout_session.payment.paid"
        ) {

            return res.json({
                received: true
            });

        }


        const checkoutSession =
            event?.data?.attributes?.data;

        const attributes =
            checkoutSession?.attributes || {};


        // reference_number contains our YKB order ID
        const orderId =
            attributes.reference_number;


        if (!orderId) {

            console.error(
                "❌ No reference_number in PayMongo event."
            );

            return res.json({
                received: true
            });

        }


        console.log(
            `💳 Payment received for ${orderId}`
        );


        // =================================================
        // FIND ORDER
        // =================================================

        const [orders] =
            await db.query(
                "SELECT order_id, status FROM orders WHERE order_id = ? LIMIT 1",
                [orderId]
            );


        if (orders.length === 0) {

            console.error(
                `❌ Order ${orderId} not found.`
            );

            return res.json({
                received: true
            });

        }


        const order =
            orders[0];


        // =================================================
        // AVOID DUPLICATE PROCESSING
        // =================================================

        if (order.status === "Paid") {

            console.log(
                `ℹ️ ${orderId} is already marked Paid.`
            );

            return res.json({
                received: true
            });

        }


        // =================================================
        // MARK ORDER AS PAID
        // =================================================

        await db.query(
            `UPDATE orders
             SET status = 'Paid'
             WHERE order_id = ?`,
            [orderId]
        );


        console.log(
            `✅ ${orderId} marked as PAID`
        );


        return res.json({
            received: true,
            success: true
        });


    } catch (error) {

        console.error(
            "❌ PayMongo webhook error:",
            error
        );

        return res.status(500).json({
            success: false
        });

    }

});


module.exports = router;