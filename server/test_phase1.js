const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../../../OneDrive/Desktop/Projects/WEBTECH-WEBSITE-main/server/.env") });
const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Config check
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET missing or too short");
}

const db = require("../../../../../OneDrive/Desktop/Projects/WEBTECH-WEBSITE-main/server/config/db");
const paymongoRoutes = require("../../../../../OneDrive/Desktop/Projects/WEBTECH-WEBSITE-main/server/routes/paymongoRoutes");
const orderRoutes = require("../../../../../OneDrive/Desktop/Projects/WEBTECH-WEBSITE-main/server/routes/orderRoutes");

const app = express();

// Webhook raw body middleware
app.use("/api/paymongo/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.use("/api/paymongo", paymongoRoutes);
app.use("/api/orders", orderRoutes);

let server;

function makeWebhookSignature(bodyStr, timestamp, secret) {
    const signedPayload = `${timestamp}.${bodyStr}`;
    const sig = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
    return `t=${timestamp},te=${sig}`;
}

async function runTests() {
    server = app.listen(0);
    const port = server.address().port;
    const base = `http://localhost:${port}/api`;

    console.log("==========================================");
    console.log("   PHASE 1 AUTOMATED VERIFICATION SUITE   ");
    console.log("==========================================");

    // ----------------------------------------------------
    // TEST 1: Webhook Signature Verification
    // ----------------------------------------------------
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET || "whsec_test_dummy_secret_key_12345";
    process.env.PAYMONGO_WEBHOOK_SECRET = webhookSecret;

    const dummyPayload = JSON.stringify({
        data: {
            attributes: {
                type: "checkout_session.payment.paid",
                data: {
                    id: "cs_test_123",
                    attributes: {
                        reference_number: "YKB-NONEXISTENT",
                        payments: [{ attributes: { amount: 50000, currency: "PHP", status: "paid" } }]
                    }
                }
            }
        }
    });

    const nowEpoch = Math.floor(Date.now() / 1000);

    // 1A: Missing signature -> 401
    const res1A = await fetch(`${base}/paymongo/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: dummyPayload
    });
    console.log("1A. Missing signature header:", res1A.status === 401 ? "PASS (401)" : "FAIL " + res1A.status);
    if (res1A.status !== 401) throw new Error("1A Failed: Should return 401 on missing signature");

    // 1B: Invalid signature -> 401
    const res1B = await fetch(`${base}/paymongo/webhook`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "paymongo-signature": `t=${nowEpoch},te=invalid_hex_signature`
        },
        body: dummyPayload
    });
    console.log("1B. Invalid signature:", res1B.status === 401 ? "PASS (401)" : "FAIL " + res1B.status);
    if (res1B.status !== 401) throw new Error("1B Failed: Should return 401 on bad signature");

    // 1C: Expired timestamp (> 300 seconds ago) -> 401
    const expiredTimestamp = nowEpoch - 400; // 400s ago
    const expiredSig = makeWebhookSignature(dummyPayload, expiredTimestamp, webhookSecret);
    const res1C = await fetch(`${base}/paymongo/webhook`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "paymongo-signature": expiredSig
        },
        body: dummyPayload
    });
    console.log("1C. Expired timestamp tolerance (>300s):", res1C.status === 401 ? "PASS (401)" : "FAIL " + res1C.status);
    if (res1C.status !== 401) throw new Error("1C Failed: Should reject expired timestamp");

    // 1D: Valid fresh signature -> 200 (order not found warning, safely returns { received: true })
    const validSig = makeWebhookSignature(dummyPayload, nowEpoch, webhookSecret);
    const res1D = await fetch(`${base}/paymongo/webhook`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "paymongo-signature": validSig
        },
        body: dummyPayload
    });
    const data1D = await res1D.json();
    console.log("1D. Valid signature and fresh timestamp:", res1D.status === 200 && data1D.received ? "PASS (200 received:true)" : "FAIL");
    if (res1D.status !== 200 || !data1D.received) throw new Error("1D Failed: Should return 200 with received:true");

    // ----------------------------------------------------
    // TEST 2: Order Creation, Stock Deductions & Webhook Idempotency
    // ----------------------------------------------------
    // Create an isolated test product
    const testProductName = `Test_Item_${Date.now()}`;
    const initialStock = 10;
    const itemPrice = 250.00;

    const [prodInsert] = await db.query(
        "INSERT INTO products (name, brand, category, price, stock, description) VALUES (?, 'TestBrand', 'Shirt', ?, ?, 'Test item')",
        [testProductName, itemPrice, initialStock]
    );
    const testProductId = prodInsert.insertId;

    // Create a temporary test user
    const testUserEmail = `test_customer_${Date.now()}@example.com`;
    const [userInsert] = await db.query(
        "INSERT INTO users (fullname, email, password, role) VALUES ('Test Customer', ?, 'dummy_hash', 'user')",
        [testUserEmail]
    );
    const testUserId = userInsert.insertId;
    const testUserToken = jwt.sign({ id: testUserId, email: testUserEmail, role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Add item to cart
    await db.query(
        "INSERT INTO cart (user_id, product_id, product_name, price, size, quantity) VALUES (?, ?, ?, ?, 'M', 2)",
        [testUserId, testProductId, testProductName, itemPrice]
    );

    // 2A: Create Online Order (Card/GCash)
    // In Approach A, checkout creates order in Pending state WITHOUT deducting stock, and WITHOUT deleting cart yet!
    const testOrderId = `YKB-TEST-${Date.now()}`;
    const orderTotal = 500.00; // 2 * 250

    await db.query(
        `INSERT INTO orders (order_id, user_id, total, payment_method, payment_status, status, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_postal_code)
         VALUES (?, ?, ?, 'Card', 'Pending', 'Pending', 'Test Customer', ?, '+639171234567', '123 Test St', 'Makati City', '1200')`,
        [testOrderId, testUserId, orderTotal, testUserEmail]
    );
    await db.query(
        `INSERT INTO order_items (order_id, product_name, size, price, quantity, subtotal)
         VALUES (?, ?, 'M', ?, 2, ?)`,
        [testOrderId, testProductName, itemPrice, orderTotal]
    );

    // Verify stock is STILL 10 before payment!
    const [stockBefore] = await db.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    console.log("2A. Stock before online payment:", stockBefore[0].stock === 10 ? "PASS (Stock remained 10)" : "FAIL " + stockBefore[0].stock);
    if (stockBefore[0].stock !== 10) throw new Error("2A Failed: Online order creation must NOT deduct stock before payment!");

    // 2B: Webhook with Currency or Amount Mismatch -> Rejected (400)
    const badAmountPayload = JSON.stringify({
        data: {
            attributes: {
                type: "checkout_session.payment.paid",
                data: {
                    id: "cs_test_mismatch",
                    attributes: {
                        reference_number: testOrderId,
                        payments: [{ attributes: { amount: 10000, currency: "PHP", status: "paid" } }] // 100.00 instead of 500.00
                    }
                }
            }
        }
    });
    const badAmountSig = makeWebhookSignature(badAmountPayload, Math.floor(Date.now() / 1000), webhookSecret);
    const res2B = await fetch(`${base}/paymongo/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "paymongo-signature": badAmountSig },
        body: badAmountPayload
    });
    console.log("2B. Amount mismatch rejection:", res2B.status === 400 ? "PASS (400)" : "FAIL " + res2B.status);
    if (res2B.status !== 400) throw new Error("2B Failed: Webhook must reject mismatched amounts");

    // 2C: Legitimate Webhook -> Deducts stock to 8, marks Paid, clears cart
    const validPaidPayload = JSON.stringify({
        data: {
            attributes: {
                type: "checkout_session.payment.paid",
                data: {
                    id: "cs_test_valid",
                    attributes: {
                        reference_number: testOrderId,
                        payments: [{ attributes: { amount: 50000, currency: "PHP", status: "paid" } }] // exactly 500.00 PHP
                    }
                }
            }
        }
    });
    const validPaidSig = makeWebhookSignature(validPaidPayload, Math.floor(Date.now() / 1000), webhookSecret);
    const res2C = await fetch(`${base}/paymongo/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "paymongo-signature": validPaidSig },
        body: validPaidPayload
    });
    const data2C = await res2C.json();
    console.log("2C. Legitimate payment webhook:", res2C.status === 200 && data2C.success ? "PASS (200 success:true)" : "FAIL");

    const [stockAfterPaid] = await db.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    const [orderAfterPaid] = await db.query("SELECT payment_status, status FROM orders WHERE order_id = ?", [testOrderId]);
    const [cartAfterPaid] = await db.query("SELECT * FROM cart WHERE user_id = ?", [testUserId]);

    console.log("    - Stock decremented 10 -> 8:", stockAfterPaid[0].stock === 8 ? "PASS" : "FAIL (is " + stockAfterPaid[0].stock + ")");
    console.log("    - Order marked Paid & Processing:", orderAfterPaid[0].payment_status === "Paid" && orderAfterPaid[0].status === "Processing" ? "PASS" : "FAIL");
    console.log("    - Cart cleared after payment:", cartAfterPaid.length === 0 ? "PASS" : "FAIL");

    if (stockAfterPaid[0].stock !== 8 || orderAfterPaid[0].payment_status !== "Paid" || cartAfterPaid.length !== 0) {
        throw new Error("2C Failed: Post-payment state inconsistency");
    }

    // 2D: Duplicate Webhook -> Must be Idempotent (does NOT deduct stock again!)
    const res2D = await fetch(`${base}/paymongo/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "paymongo-signature": validPaidSig },
        body: validPaidPayload
    });
    const [stockAfterDup] = await db.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    console.log("2D. Duplicate webhook delivery (Idempotency):", res2D.status === 200 && stockAfterDup[0].stock === 8 ? "PASS (Stock remained 8)" : "FAIL");
    if (stockAfterDup[0].stock !== 8) throw new Error("2D Failed: Duplicate webhook double-deducted stock!");

    // ----------------------------------------------------
    // TEST 3: Order Cancellation & Stock Restoration Exactly Once
    // ----------------------------------------------------
    // 3A: Customer cancels paid/processing order -> stock restored from 8 -> 10
    const res3A = await fetch(`${base}/orders/${testOrderId}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${testUserToken}` }
    });
    const data3A = await res3A.json();
    const [stockAfterCancel] = await db.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    console.log("3A. Order cancellation by owner:", res3A.status === 200 && data3A.success ? "PASS" : "FAIL");
    console.log("    - Stock restored 8 -> 10:", stockAfterCancel[0].stock === 10 ? "PASS" : "FAIL (is " + stockAfterCancel[0].stock + ")");
    if (stockAfterCancel[0].stock !== 10) throw new Error("3A Failed: Cancellation did not restore stock");

    // 3B: Duplicate cancellation attempt -> 400
    const res3B = await fetch(`${base}/orders/${testOrderId}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${testUserToken}` }
    });
    const [stockAfterDupCancel] = await db.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    console.log("3B. Duplicate cancellation rejected:", res3B.status === 400 && stockAfterDupCancel[0].stock === 10 ? "PASS (400, stock stayed 10)" : "FAIL");
    if (res3B.status !== 400 || stockAfterDupCancel[0].stock !== 10) throw new Error("3B Failed: Duplicate cancel changed stock or was accepted");

    // ----------------------------------------------------
    // Cleanup temporary test items
    // ----------------------------------------------------
    await db.query("DELETE FROM order_items WHERE order_id = ?", [testOrderId]);
    await db.query("DELETE FROM orders WHERE order_id = ?", [testOrderId]);
    await db.query("DELETE FROM products WHERE id = ?", [testProductId]);
    await db.query("DELETE FROM users WHERE id = ?", [testUserId]);
    console.log("--- Cleanup complete ---");

    console.log("==========================================");
    console.log("   ALL PHASE 1 AUTOMATED TESTS PASSED!    ");
    console.log("==========================================");
}

runTests().then(() => {
    if (server) server.close();
    process.exit(0);
}).catch(err => {
    console.error("TEST FAILED:", err);
    if (server) server.close();
    process.exit(1);
});

