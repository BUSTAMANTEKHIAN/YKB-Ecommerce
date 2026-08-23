const user = JSON.parse(localStorage.getItem("currentUser"));

const ordersContainer = document.getElementById("orders-list");

if (!user) {
    alert("Please login first!");
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", loadOrders);

// =========================
// LOAD ORDERS FROM MYSQL
// =========================
function loadOrders() {

    fetch(`${API_BASE_URL}/api/orders/${user.id}`)
    .then(res => res.json())
    .then(data => {

        renderOrders(data);

    })
    .catch(err => {
        console.error(err);
        ordersContainer.innerHTML = "<p>Error loading orders</p>";
    });
}

// =========================
// RENDER ORDERS
// =========================
// =========================
// RENDER ORDERS WITH TRACKER
// =========================
function renderOrders(orders) {

    ordersContainer.innerHTML = "";

    if (!orders || orders.length === 0) {
        ordersContainer.innerHTML = "<p>No orders found</p>";
        return;
    }

    orders.forEach(order => {

        let progress = 0;

        switch (order.status) {
            case "Pending":
                progress = 25;
                break;
            case "Processing":
                progress = 50;
                break;
            case "Shipped":
                progress = 75;
                break;
            case "Delivered":
                progress = 100;
                break;
            case "Cancelled":
                progress = 0;
                break;
        }

        ordersContainer.innerHTML += `
        <div class="order-card">

            <div class="order-header">
                <h3>Order ID: ${order.order_id}</h3>
                <span class="status-badge ${order.status.toLowerCase()}">
                    ${order.status}
                </span>
            </div>

            <p><strong>Total:</strong> ₱${Number(order.total).toLocaleString()}</p>
            <p><strong>Payment:</strong> ${order.payment_method}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>

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

        </div>
        `;
    });
}