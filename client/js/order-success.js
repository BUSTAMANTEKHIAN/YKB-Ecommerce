document.addEventListener("DOMContentLoaded", renderOrderSuccess);

function renderOrderSuccess() {
    const orderNumberEl = document.getElementById("order-number");
    const orderDateEl = document.getElementById("order-date");
    const orderTotalEl = document.getElementById("order-total");
    const orderItemsEl = document.getElementById("order-items");
    const placeholderImage = "images/products/p1.jpg";

    let lastOrder = null;
    try {
        lastOrder = JSON.parse(localStorage.getItem("lastOrder"));
    } catch (error) {
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
            // Old product rows may store the development server's full URL.
            // Use the same image path on the current host when that happens.
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

    fetch(`${API_BASE_URL}/api/orders/receipt/${encodeURIComponent(orderId)}`)
        .then(response => {
            if (!response.ok) throw new Error(`Request failed: ${response.status}`);
            return response.json();
        })
        .then(data => {
            orderDateEl.textContent = new Date(data.order.created_at).toLocaleDateString(undefined, {
                year: "numeric", month: "long", day: "numeric"
            });
            orderTotalEl.textContent = `₱${Number(data.order.total).toLocaleString()}`;
            renderItems(data.items);
            localStorage.removeItem("lastOrder");
        })
        .catch(error => {
            console.error("Order confirmation load error:", error);
            orderItemsEl.textContent = "Your order was submitted, but its summary could not be loaded. Check My Orders for the latest status.";
        });
}
