const user = JSON.parse(localStorage.getItem("currentUser"));

const ordersContainer = document.getElementById("orders-list");
const ordersLoading = document.getElementById("orders-loading");
const toastStack = document.getElementById("toast-stack");

// Guard was missing a `return` — without it, the fetch below still fired
// with `user.id` on a null user (throwing) even after starting the
// redirect. The redirect now short-circuits everything past this point.
if (!user) {
    showToast("Please log in to view your orders.", "error");
    setTimeout(() => {
        window.location.href = "login.html";
    }, 900);
} else {
    document.addEventListener("DOMContentLoaded", loadOrders);
}

// =========================
// LOAD ORDERS FROM MYSQL
// =========================
function loadOrders() {

    setLoading(true);

    fetch(`${API_BASE_URL}/api/orders/${user.id}`)
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
// RENDER ORDERS WITH TRACKER
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

    // Built as an array and joined once, instead of `innerHTML +=` inside
    // the loop — `+=` re-parses the entire container on every iteration,
    // which is wasteful and would drop any listeners attached to earlier cards.
    const cards = orders.map(order => {

        const status = (order.status || "Pending");
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

        return `
        <div class="order-card">

            <div class="order-header">
                <div>
                    <span class="order-id">Order #${order.order_id}</span>
                    <span class="order-date">${new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <span class="status-badge ${statusClass}">${status}</span>
            </div>

            <div class="order-meta">
                <span><strong>Total:</strong> ₱${Number(order.total).toLocaleString()}</span>
                <span><strong>Payment:</strong> ${order.payment_method}</span>
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

        </div>
        `;

    }).join("");

    ordersContainer.innerHTML = cards;
}

// Same stacked-toast pattern used on cart.js / checkout.js
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