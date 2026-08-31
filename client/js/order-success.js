// Single source of truth: checkout.js writes "lastOrder" to localStorage
// right before redirecting here. This page has no API call of its own —
// it only ever renders what checkout.js handed off.

document.addEventListener("DOMContentLoaded", renderOrderSuccess);

function renderOrderSuccess() {

    const orderNumberEl = document.getElementById("order-number");
    const orderDateEl = document.getElementById("order-date");
    const orderTotalEl = document.getElementById("order-total");
    const orderItemsEl = document.getElementById("order-items");

    let lastOrder = null;

    try {
        lastOrder = JSON.parse(localStorage.getItem("lastOrder"));
    } catch (e) {
        lastOrder = null;
    }

    // No order on record — most likely the page was opened directly
    // rather than reached via checkout. Bounce to shop rather than
    // showing a confirmation for an order that doesn't exist.
    if (!lastOrder || !lastOrder.orderId) {
        window.location.href = "shop.html";
        return;
    }

    orderNumberEl.textContent = `#${lastOrder.orderId}`;

    if (lastOrder.placedAt) {
        const date = new Date(lastOrder.placedAt);
        orderDateEl.textContent = date.toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric"
        });
    }

    if (typeof lastOrder.total === "number") {
        orderTotalEl.textContent = `₱${lastOrder.total.toLocaleString()}`;
    }

    renderItems(lastOrder.items);

    // Order is confirmed and rendered — clear it so refreshing or
    // revisiting this URL later doesn't show a stale "success" screen.
    localStorage.removeItem("lastOrder");

    function renderItems(items) {

        if (!items || !items.length) {
            orderItemsEl.innerHTML = "";
            return;
        }

        const rows = items.map(item => `
            <div class="order-item">
                <div class="order-item__img">
                    <img
                        src="${item.image || 'images/placeholder.jpg'}"
                        alt="${item.product_name}"
                        onerror="this.src='images/placeholder.jpg'"
                    >
                </div>
                <div class="order-item__info">
                    <h4>${item.product_name}</h4>
                    <span>Qty ${item.quantity}${item.size ? ` · ${item.size}` : ""}</span>
                </div>
                <div class="order-item__price">₱${(item.price * item.quantity).toLocaleString()}</div>
            </div>
        `).join("");

        orderItemsEl.innerHTML = rows;
    }
}