const container = document.getElementById("receipt-content");

const user = JSON.parse(localStorage.getItem("currentUser"));

// get order_id from URL
const params = new URLSearchParams(window.location.search);
const order_id = params.get("order_id");

if (!order_id) {
    window.location.href = "orders.html";
}

fetch(`http://localhost:3000/api/orders/receipt/${order_id}`)
.then(res => res.json())
.then(data => {

    if (!data) {
        container.innerHTML = "<p>Order not found</p>";
        return;
    }

    const order = data.order;
    const items = data.items;

    let productsHTML = "";
    let subtotal = 0;

    items.forEach(item => {

        const total = item.price * item.quantity;
        subtotal += total;

        productsHTML += `
            <div class="receipt-product">
                <img src="${item.image || 'images/product.png'}">

                <div class="product-details">
                    <h3>${item.product_name}</h3>
                    <p>Quantity: ${item.quantity}</p>
                    <p class="product-price">₱${total.toLocaleString()}</p>
                </div>
            </div>
            <div class="total-row">
    <span>Shipping</span>
    <span>Free</span>
</div>
        `;
    });

    container.innerHTML = `
    <div class="receipt-info">

        <div class="info-card">
            <h4>Order Number</h4>
            <p>${order.order_id}</p>
        </div>

        <div class="info-card">
            <h4>Date</h4>
            <p>${order.created_at}</p>
        </div>

        <div class="info-card">
            <h4>Status</h4>
            <p class="status ${order.status.toLowerCase()}">
                ${order.status}
            </p>
        </div>

        <div class="info-card">
            <h4>Payment</h4>
            <p>${order.payment_method}</p>
        </div>

    </div>

    <div class="summary-card">
        <h3>Order Summary</h3>
        <p><strong>Items:</strong> ${items.length}</p>
        <p><strong>Total:</strong> ₱${order.total}</p>
    </div>

    ${productsHTML}

    <div class="receipt-total">

        <div class="total-row grand-total">
            <span>Total</span>
            <span>₱${order.total}</span>
        </div>

    </div>
    `;
});