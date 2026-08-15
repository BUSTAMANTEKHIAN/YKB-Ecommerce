fetch("http://localhost:3000/api/admin/dashboard")
.then(res => res.json())
.then(data => {

    document.getElementById("total-orders").innerText = data.totalOrders;
    document.getElementById("total-users").innerText = data.totalUsers;
    document.getElementById("total-sales").innerText = "₱" + data.totalSales;

    const container = document.getElementById("recent-orders");

    data.recentOrders.forEach(order => {

        container.innerHTML += `
        <div class="order-card">
            <h4>${order.order_id}</h4>
            <p>₱${order.total}</p>
            <p>Status: ${order.status}</p>

            <select onchange="updateStatus('${order.order_id}', this.value)">
                <option>Pending</option>
                <option>Processing</option>
                <option>Shipped</option>
                <option>Delivered</option>
            </select>
        </div>
        `;
    });

});

function updateStatus(order_id, status) {

    fetch(`http://localhost:3000/api/admin/order-status/${order_id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(() => {
        alert("Status updated!");
    });

}