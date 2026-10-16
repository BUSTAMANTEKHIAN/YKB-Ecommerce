const user = JSON.parse(localStorage.getItem("currentUser"));

const ordersContainer = document.getElementById("orders-list");
const ordersLoading = document.getElementById("orders-loading");
const toastStack = document.getElementById("toast-stack");

if (!user) {
    showToast("Please log in to view your orders.", "error");
    setTimeout(() => {
        window.location.href = "login.html";
    }, 900);
} else {
    document.addEventListener("DOMContentLoaded", () => {
        loadOrders();
        setupOrderActions();
    });
}

// =========================
// LOAD ORDERS FROM MYSQL
// =========================
function loadOrders() {
    setLoading(true);

    fetch(`${API_BASE_URL}/api/orders/my-orders`)
        .then(res => {
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            return res.json();
        })
        .then(data => {
            renderOrders(data);
        })
        .catch(err => {
            console.error("Failed to load orders:", err);
            showToast("Couldn't load your orders. Please try again.", "error");
            renderError();
        })
        .finally(() => setLoading(false));
}

function setLoading(isLoading) {
    if (!ordersLoading || !ordersContainer) return;
    ordersLoading.classList.toggle("show", isLoading);
    ordersContainer.style.display = isLoading ? "none" : "";
}

function renderError() {
    ordersContainer.innerHTML = `
        <div class="empty">
            <i class="fas fa-triangle-exclamation"></i>
            <h3>Something went wrong</h3>
            <p>We couldn't load your orders right now. Please refresh the page.</p>
        </div>
    `;
}

// =========================
// RENDER ORDERS WITH TRACKER & ACTIONS
// =========================
function renderOrders(orders) {
    if (!orders || orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty">
                <i class="fas fa-box-open"></i>
                <h3>No orders yet</h3>
                <p>When you place an order, it'll show up here.</p>
                <a href="shop.html" class="normal">Start Shopping</a>
            </div>
        `;
        return;
    }

    const cards = orders.map(order => {
        const status = order.status || "Pending";
        const statusClass = status.toLowerCase();

        let progress = 0;
        switch (status) {
            case "Pending":    progress = 25;  break;
            case "Processing": progress = 50;  break;
            case "Shipped":    progress = 75;  break;
            case "Delivered":  progress = 100; break;
            case "Cancelled":  progress = 0;   break;
        }

        const isCancelled = status === "Cancelled";
        const isEligibleRetry = !isCancelled && order.payment_method !== "COD" && String(order.payment_status).toLowerCase() === "pending" && status === "Pending";
        const isEligibleCancel = !isCancelled && (status === "Pending" || status === "Processing");

        return `
        <div class="order-card" data-order-id="${escapeHtml(order.order_id)}">

            <div class="order-header">
                <div>
                    <span class="order-id">Order #${escapeHtml(order.order_id)}</span>
                    <span class="order-date">${new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <span class="status-badge ${escapeHtml(statusClass)}">${escapeHtml(status)}</span>
            </div>

            <div class="order-meta">
                <span>
                    <strong>Total:</strong>
                    ₱${Number(order.total).toLocaleString()}
                </span>
                
                <span>
                    <strong>Payment:</strong>
                    ${escapeHtml(order.payment_method || "N/A")}
                </span>
                
                <span class="payment-status ${escapeHtml(String(order.payment_status || "Pending").toLowerCase())}">
                    <i class="fas ${
                        String(order.payment_status || "Pending").toLowerCase() === "paid"
                            ? "fa-circle-check"
                            : "fa-clock"
                    }"></i>
                    <strong>Payment:</strong>
                    ${escapeHtml(order.payment_status || "Pending")}
                </span>
            </div>

            ${!isCancelled ? `
            <div class="tracker">
                <div class="tracker-bar">
                    <div class="tracker-fill" style="width:${progress}%"></div>
                </div>

                <div class="tracker-steps">
                    <span class="${progress >= 25 ? "active" : ""}">Pending</span>
                    <span class="${progress >= 50 ? "active" : ""}">Processing</span>
                    <span class="${progress >= 75 ? "active" : ""}">Shipped</span>
                    <span class="${progress >= 100 ? "active" : ""}">Delivered</span>
                </div>
            </div>
            ` : `
            <div class="tracker tracker--cancelled">
                <i class="fas fa-circle-xmark"></i> This order was cancelled.
            </div>
            `}

            <div class="order-actions" style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="receipt.html?order_id=${encodeURIComponent(order.order_id)}" class="btn-receipt" style="display: inline-block; padding: 6px 16px; border-radius: 50px; border: 1px solid #088178; color: #088178; text-decoration: none; font-size: 13px; font-weight: 600;">
                    <i class="fas fa-file-invoice"></i> View Receipt
                </a>
                ${isEligibleRetry ? `
                <button type="button" class="btn-retry-payment" data-id="${escapeHtml(order.order_id)}" style="background: #088178; color: #fff; border: none; padding: 6px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-credit-card"></i> Pay Now
                </button>
                ` : ""}
                ${isEligibleCancel ? `
                <button type="button" class="btn-cancel-order" data-id="${escapeHtml(order.order_id)}" style="background: transparent; color: #dc2626; border: 1px solid #dc2626; padding: 6px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    Cancel Order
                </button>
                ` : ""}
            </div>

        </div>
        `;
    }).join("");

    ordersContainer.innerHTML = cards;
}

// =========================
// ACTION EVENT HANDLERS
// =========================
function setupOrderActions() {
    if (!ordersContainer) return;

    ordersContainer.addEventListener("click", async (e) => {
        const retryBtn = e.target.closest(".btn-retry-payment");
        const cancelBtn = e.target.closest(".btn-cancel-order");

        if (retryBtn) {
            const orderId = retryBtn.dataset.id;
            retryBtn.disabled = true;
            retryBtn.textContent = "Redirecting...";
            try {
                const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/retry-payment`, {
                    method: "POST"
                });
                const data = await res.json();
                if (!res.ok || !data.success || !data.checkout_url) {
                    showToast(data.message || "Unable to restart payment session.", "error");
                    retryBtn.disabled = false;
                    retryBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pay Now';
                    return;
                }
                showToast("Redirecting to payment gateway...", "success");
                setTimeout(() => {
                    window.location.href = data.checkout_url;
                }, 600);
            } catch (err) {
                console.error("Retry payment error:", err);
                showToast("Failed to connect. Please try again.", "error");
                retryBtn.disabled = false;
                retryBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pay Now';
            }
            return;
        }

        if (cancelBtn) {
            const orderId = cancelBtn.dataset.id;
            cancelBtn.disabled = true;
            try {
                const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/cancel`, {
                    method: "POST"
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    showToast(data.message || "Failed to cancel order.", "error");
                    cancelBtn.disabled = false;
                    return;
                }
                showToast(data.message || "Order cancelled.", "success");
                loadOrders();
            } catch (err) {
                console.error("Cancel order error:", err);
                showToast("Failed to connect. Please try again.", "error");
                cancelBtn.disabled = false;
            }
        }
    });
}

function showToast(text, type = "success") {
    if (!toastStack) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = text;
    toastStack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("animationend", () => toast.remove());
    }, 2500);
}
