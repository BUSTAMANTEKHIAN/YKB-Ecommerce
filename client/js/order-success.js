document.addEventListener("DOMContentLoaded", renderOrderSuccess);

function renderOrderSuccess() {
    const orderNumberEl = document.getElementById("order-number");
    const orderDateEl = document.getElementById("order-date");
    const orderTotalEl = document.getElementById("order-total");
    const orderItemsEl = document.getElementById("order-items");
    const checkmarkEl = document.querySelector(".checkmark");
    const eyebrowEl = document.querySelector(".success-eyebrow");
    const headingEl = document.querySelector(".success-card h1");
    const messageEl = document.querySelector(".success-card .message");
    const placeholderImage = "images/products/p1.jpg";

    let lastOrder = null;
    try {
        lastOrder = JSON.parse(localStorage.getItem("lastOrder"));
    } catch {
        lastOrder = null;
    }

    const orderId = new URLSearchParams(window.location.search).get("order_id") || lastOrder?.orderId;
    if (!orderId) {
        window.location.href = "shop.html";
        return;
    }

    orderNumberEl.textContent = `#${orderId}`;

    function renderItems(items) {
        if (!Array.isArray(items) || !items.length) {
            orderItemsEl.innerHTML = "";
            return;
        }

        orderItemsEl.innerHTML = items.map(item => {
            const storedImage = String(item.image || "").trim();
            const imageSource = /^http:\/\/localhost(?::3000)?\//i.test(storedImage)
                ? storedImage.replace(/^http:\/\/localhost(?::3000)?\//i, "")
                : storedImage;
            return `
            <div class="order-item">
                <div class="order-item__img">
                    <img src="${safeImageUrl(imageSource, placeholderImage)}"
                         alt="${escapeHtml(item.product_name)}"
                         onerror="this.onerror=null;this.src='${placeholderImage}'">
                </div>
                <div class="order-item__info">
                    <h4>${escapeHtml(item.product_name)}</h4>
                    <span>Qty ${Number(item.quantity)}${item.size ? ` · ${escapeHtml(item.size)}` : ""}</span>
                </div>
                <div class="order-item__price">₱${(Number(item.price) * Number(item.quantity)).toLocaleString()}</div>
            </div>
        `;
        }).join("");
    }

    let pollAttempts = 0;
    const maxPollAttempts = 4;

    function checkOrderStatus() {
        fetch(`${API_BASE_URL}/api/orders/receipt/${encodeURIComponent(orderId)}`)
            .then(response => {
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                return response.json();
            })
            .then(data => {
                const order = data.order;
                if (!order) throw new Error("Order data missing");

                orderDateEl.textContent = new Date(order.created_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "long", day: "numeric"
                });
                orderTotalEl.textContent = `₱${Number(order.total).toLocaleString()}`;
                renderItems(data.items);

                const isCOD = order.payment_method === "COD";
                const isPaid = String(order.payment_status).toLowerCase() === "paid";
                const isCancelled = order.status === "Cancelled";

                if (isCancelled) {
                    if (checkmarkEl) checkmarkEl.innerHTML = '<i class="fa-solid fa-ban" style="color: #dc2626;"></i>';
                    if (eyebrowEl) eyebrowEl.textContent = "Order cancelled";
                    if (headingEl) headingEl.textContent = "Payment Not Completed";
                    if (messageEl) messageEl.textContent = "Your checkout session was cancelled or expired. Your cart has been preserved.";
                    return;
                }

                if (isPaid || isCOD) {
                    if (checkmarkEl) checkmarkEl.innerHTML = '<i class="fa-solid fa-check"></i>';
                    if (eyebrowEl) eyebrowEl.textContent = "Order confirmed";
                    if (headingEl) headingEl.textContent = "Thank You For Your Order!";
                    if (messageEl) {
                        messageEl.textContent = isCOD
                            ? "Your Cash on Delivery order has been placed and is being prepared for shipment."
                            : "Your payment was confirmed successfully and your order is now being processed.";
                    }
                    localStorage.removeItem("lastOrder");
                    return;
                }

                // If online payment is still Pending, poll within a bounded limit
                if (pollAttempts < maxPollAttempts) {
                    pollAttempts++;
                    if (eyebrowEl) eyebrowEl.textContent = "Confirming payment...";
                    if (headingEl) headingEl.textContent = "Verifying Your Payment";
                    if (messageEl) messageEl.textContent = "We are awaiting confirmation from your payment provider. This usually takes just a few seconds...";
                    setTimeout(checkOrderStatus, 2500);
                } else {
                    // Terminal poll state: still pending
                    if (checkmarkEl) checkmarkEl.innerHTML = '<i class="fa-solid fa-clock" style="color: #088178;"></i>';
                    if (eyebrowEl) eyebrowEl.textContent = "Payment processing";
                    if (headingEl) headingEl.textContent = "Order Placed & Awaiting Confirmation";
                    if (messageEl) messageEl.textContent = "Your payment is currently being confirmed by your payment provider. You can check for live status updates in My Orders.";
                }
            })
            .catch(error => {
                console.error("Order confirmation load error:", error);
                orderItemsEl.textContent = "Your order was submitted. Check My Orders to view the latest status.";
            });
    }

    checkOrderStatus();
}
