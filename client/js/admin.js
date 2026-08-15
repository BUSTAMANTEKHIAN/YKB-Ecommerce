let salesChart;

// =========================
// ADMIN AUTH PROTECTION
// =========================

const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (
    !currentUser ||
    (currentUser.role !== "admin" && currentUser.role !== "owner")
) {
    alert("Access denied.");
    window.location.href = "index.html";
}

if (!currentUser) {

    alert("Please login first.");
    window.location.href = "login.html";

}

if (
    currentUser.role !== "admin" &&
    currentUser.role !== "owner"
) {
    document.body.innerHTML = `
        <div style="
            height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            font-family:Arial,sans-serif;
            text-align:center;
            background:#f8fafc;
        ">
            <h1 style="color:#dc2626;">Access Denied</h1>
            <p>This page is only available for administrators and owners.</p>
            <a href="index.html" style="
                margin-top:20px;
                padding:12px 20px;
                background:#088178;
                color:#fff;
                text-decoration:none;
                border-radius:8px;
            ">Return to Home</a>
        </div>
    `;
    throw new Error("Unauthorized");
}

document.getElementById("adminName").textContent =
    currentUser.fullname || "Admin";

const tableBody = document.getElementById("productsTableBody");

// Load products from database
async function loadProducts() {
    try {
        const response = await fetch("http://localhost:3000/api/products");
        const products = await response.json();

        // Update dashboard stats
        document.getElementById("totalProducts").textContent = products.length;

        const lowStock = products.filter(p => Number(p.stock) <= 5).length;
        document.getElementById("lowStock").textContent = lowStock;

        const alert = document.getElementById("lowStockAlert");

        if (alert) {
            alert.style.display = lowStock > 0 ? "block" : "none";
        }

        renderProducts(products);

    } catch (error) {
        console.error(error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    Failed to load products.
                </td>
            </tr>
        `;
    }
}

function renderProducts(products) {

    tableBody.innerHTML = products.map(product => `
        <tr>
            <td>${product.id}</td>

            <td>
                <img src="${product.image}" alt="${product.name}">
            </td>

            <td>${product.name}</td>

            <td>${product.category}</td>

            <td>₱${Number(product.price).toLocaleString()}</td>

<td>
    <span class="stock-badge ${
        product.stock === 0
            ? "out"
            : product.stock <= 2
                ? "critical"
                : product.stock <= 5
                    ? "low"
                    : "normal"
    }">
        ${
            product.stock === 0
                ? "Out of Stock"
                : product.stock <= 2
                    ? `Critical (${product.stock})`
                    : product.stock <= 5
                        ? `Low (${product.stock})`
                        : `${product.stock}`
        }
    </span>
</td>

            <td>
                <button class="edit-btn" onclick="editProduct(${product.id})">
                    Edit
                </button>

                <button class="delete-btn" onclick="deleteProduct(${product.id})">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

}

window.editProduct = async function(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/products`);
        const products = await response.json();

        const product = products.find(p => p.id == id);

        if (!product) {
            alert("Product not found.");
            return;
        }

        // Fill the form
        document.getElementById("productId").value = product.id;
        document.getElementById("name").value = product.name;
        document.getElementById("brand").value = product.brand;
        document.getElementById("category").value = product.category;
        document.getElementById("description").value = product.description;
        document.getElementById("price").value = product.price;
        document.getElementById("stock").value = product.stock;
        document.getElementById("image").value = product.image;

        // Change modal title
        document.querySelector(".modal-header h2").textContent = "Edit Product";

        // Open modal
        productModal.classList.add("active");

    } catch (error) {
        console.error(error);
        alert("Failed to load product.");
    }
};

// Temporary delete function
window.deleteProduct = async function(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {

        const response = await fetch(
            `http://localhost:3000/api/products/${id}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Failed to delete product.");
            return;
        }

        alert("Product deleted successfully!");

        loadProducts();

    } catch (error) {

        console.error(error);

        alert("Server error.");

    }

};

// Logout
const logoutBtn = document.getElementById("adminLogout");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {

        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");

        window.location.href = "login.html";

    });
}

// =========================
// PRODUCT MODAL
// =========================

const addProductBtn = document.getElementById("addProductBtn");
const productModal = document.getElementById("productModal");
const closeModal = document.getElementById("closeModal");

if (addProductBtn && productModal) {
    addProductBtn.addEventListener("click", () => {
        productModal.classList.add("active");
    });
}

if (closeModal && productModal) {
    closeModal.addEventListener("click", () => {
        productModal.classList.remove("active");
    });
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === productModal) {
        productModal.classList.remove("active");
    }
});

// =========================
// IMAGE UPLOAD
// =========================

const imageFile = document.getElementById("imageFile");
const imagePreview = document.getElementById("imagePreview");
const imageInput = document.getElementById("image");

if (imageFile) {
    imageFile.addEventListener("change", async () => {

        const file = imageFile.files[0];
        if (!file) return;

        // Preview image
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";

        // Upload image to server
        const formData = new FormData();
        formData.append("image", file);

        try {

            const response = await fetch(
                "http://localhost:3000/api/products/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert("Image upload failed.");
                return;
            }

            // Save image path into hidden input
            imageInput.value = data.imagePath;

        } catch (error) {

            console.error(error);

            alert("Cannot upload image.");

        }

    });
}

// =========================
// ADD PRODUCT
// =========================

const productForm = document.getElementById("productForm");

if (productForm) {
    productForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const product = {
            name: document.getElementById("name").value.trim(),
            brand: document.getElementById("brand").value.trim(),
            category: document.getElementById("category").value,
            description: document.getElementById("description").value.trim(),
            price: parseFloat(document.getElementById("price").value),
            stock: parseInt(document.getElementById("stock").value),
            image: document.getElementById("image").value.trim()
        };

        try {
            const productId = document.getElementById("productId").value;

            const response = await fetch(
                productId
                    ? `http://localhost:3000/api/products/${productId}`
                    : "http://localhost:3000/api/products",
                {
                    method: productId ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(product)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to add product.");
                return;
            }

            alert("Product added successfully!");

            productForm.reset();
            document.getElementById("productId").value = "";
            document.querySelector(".modal-header h2").textContent = "Add New Product";

            productModal.classList.remove("active");

            loadProducts();

        } catch (error) {
            console.error(error);
            alert("Server error.");
        }
    });
}

// =========================
// LOAD ORDERS
// =========================

const ordersTableBody = document.getElementById("ordersTableBody");

async function loadOrders() {

    if (!ordersTableBody) return;

    try {

        const response = await fetch(
            "http://localhost:3000/api/orders/admin/all"
        );

        const orders = await response.json();

        document.getElementById("totalOrders").textContent = orders.length;

        const revenue = orders.reduce(
            (sum, order) => sum + Number(order.total),
            0
        );

        document.getElementById("totalRevenue").textContent =
            "₱" + revenue.toLocaleString();

        // =========================
// MONTHLY SALES CHART
// =========================

const monthlySales = {};

orders.forEach(order => {

    const date = new Date(order.created_at);

    const month = date.toLocaleString("default", {
        month: "short"
    });

    monthlySales[month] =
        (monthlySales[month] || 0) + Number(order.total);

});

const labels = Object.keys(monthlySales);
const values = Object.values(monthlySales);

const ctx = document.getElementById("salesChart");

if (ctx) {

    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {

        type: "bar",

        data: {

            labels,

            datasets: [{

                label: "Sales (₱)",

                data: values,

                backgroundColor: "#088178",

                borderRadius: 10

            }]

        },

        options: {

            responsive: true,

            plugins: {
                legend: {
                    display: false
                }
            }

        }

    });

}

        ordersTableBody.innerHTML = orders.map(order => `
            <tr>

                <td>${order.order_id}</td>

                <td>
                    <strong>${order.fullname}</strong><br>
                    <small>${order.email}</small>
                </td>

                <td>₱${Number(order.total).toLocaleString()}</td>

                <td>
                    <select onchange="updateOrderStatus('${order.order_id}', this.value)">
                        <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="Processing" ${order.status === "Processing" ? "selected" : ""}>Processing</option>
                        <option value="Shipped" ${order.status === "Shipped" ? "selected" : ""}>Shipped</option>
                        <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
                        <option value="Cancelled" ${order.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                    </select>
                </td>

                <td>${new Date(order.created_at).toLocaleDateString()}</td>

                <td>
                    <button class="edit-btn" onclick="viewOrder('${order.order_id}')">
                        View
                    </button>
                </td>

            </tr>
        `).join("");

    } catch (error) {

        console.error(error);

        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    Failed to load orders.
                </td>
            </tr>
        `;

    }

}

window.updateOrderStatus = async function(orderId, status) {

    try {

        await fetch(
            `http://localhost:3000/api/orders/admin/${orderId}/status`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            }
        );

    } catch (error) {

        console.error(error);

        alert("Failed to update order status.");

    }

};

// =========================
// VIEW ORDER DETAILS
// =========================

const orderModal = document.getElementById("orderModal");
const closeOrderModal = document.getElementById("closeOrderModal");
const orderDetails = document.getElementById("orderDetails");

if (closeOrderModal) {
    closeOrderModal.addEventListener("click", () => {
        orderModal.classList.remove("active");
    });
}

window.viewOrder = async function(orderId) {
    try {
        orderModal.classList.add("active");
        orderDetails.innerHTML = "<p>Loading order...</p>";

        const response = await fetch(
            `http://localhost:3000/api/orders/admin/${orderId}`
        );

        const data = await response.json();

        const order = data.order;
        const items = data.items;

        orderDetails.innerHTML = `
            <div class="order-info">
                <div class="order-card">
                    <h4>Order ID</h4>
                    <p>${order.order_id}</p>
                </div>

                <div class="order-card">
                    <h4>Customer</h4>
                    <p>${order.fullname}</p>
                </div>

                <div class="order-card">
                    <h4>Email</h4>
                    <p>${order.email}</p>
                </div>

                <div class="order-card">
                    <h4>Payment</h4>
                    <p>${order.payment_method}</p>
                </div>

                <div class="order-card">
                    <h4>Status</h4>
                    <p>${order.status}</p>
                </div>

                <div class="order-card">
                    <h4>Total</h4>
                    <p>₱${Number(order.total).toLocaleString()}</p>
                </div>
            </div>

            <table class="order-items-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>

                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.product_name}</td>
                            <td>₱${Number(item.price).toLocaleString()}</td>
                            <td>${item.quantity}</td>
                            <td>₱${Number(item.subtotal).toLocaleString()}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

    } catch (error) {
        console.error(error);
        orderDetails.innerHTML = "<p>Failed to load order.</p>";
    }
};

// =========================
// LOAD USERS
// =========================

const usersTableBody = document.getElementById("usersTableBody");
const userSearch = document.getElementById("userSearch");

let allUsers = [];

async function loadUsers() {

    if (!usersTableBody) return;

    try {

        const response = await fetch(
            "http://localhost:3000/api/admin/users"
        );

        const users = await response.json();

        allUsers = users;

        renderUsers(users);

    } catch (error) {

        console.error(error);

        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    Failed to load users.
                </td>
            </tr>
        `;

    }

}

function renderUsers(users) {

    usersTableBody.innerHTML = users.map(user => `
        <tr>

            <td>${user.id}</td>

            <td>${user.fullname}</td>

            <td>${user.email}</td>

            <td>
                <span class="status-badge ${user.role}">
                    ${user.role}
                </span>
                ${
                    user.suspended_until
                        ? `<br><span class="status-badge banned">Suspended</span>`
                        : ""
                }
            </td>

            <td>${new Date(user.created_at).toLocaleDateString()}</td>

            <td>

                ${
                    user.role === "owner"
                        ? `
                            <span class="status-badge owner">
                                Protected Owner
                            </span>
                          `
                        : `
                            <button
                                class="edit-btn"
                                onclick="toggleRole(${user.id}, '${user.role}')"
                            >
                                ${user.role === "admin"
                                    ? "Make User"
                                    : "Make Admin"}
                            </button>

                            <br><br>

                            ${
                                user.suspended_until
                                    ? `
                                        <button
                                            class="edit-btn"
                                            onclick="unbanUser(${user.id})"
                                        >
                                            Unban
                                        </button>
                                      `
                                    : `
                                        <button
                                            class="edit-btn"
                                            onclick="suspendUser(${user.id}, 3)"
                                        >
                                            Suspend 3d
                                        </button>

                                        <button
                                            class="edit-btn"
                                            onclick="suspendUser(${user.id}, 7)"
                                        >
                                            Suspend 7d
                                        </button>

                                        <button
                                            class="delete-btn"
                                            onclick="suspendUser(${user.id}, 'permanent')"
                                        >
                                            Permanent Ban
                                        </button>
                                      `
                            }
                          `
                }

            </td>

        </tr>
    `).join("");

}

window.toggleRole = async function(userId, currentRole) {

    const newRole =
        currentRole === "admin"
            ? "user"
            : "admin";

    try {

        const response = await fetch(
            `http://localhost:3000/api/admin/users/${userId}/role`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    role: newRole,
                    adminRole: currentUser.role
                })
            }
        );

        const data = await response.json();

        if (!data.success) {
            alert(data.message || "Failed to update role.");
            return;
        }

        loadUsers();

    } catch (error) {

        console.error(error);

        alert("Failed to update role.");

    }

};

// =========================
// SUSPEND USER
// =========================
window.suspendUser = async function(userId, days) {

    const label =
        days === "permanent"
            ? "permanently ban"
            : `suspend for ${days} days`;

    if (!confirm(`Are you sure you want to ${label} this user?`)) return;

    try {

        // Get the currently logged-in admin/owner
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));

        const response = await fetch(
            `http://localhost:3000/api/admin/users/${userId}/suspend`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    days,
                    adminRole: currentUser.role
                })
            }
        );

        const data = await response.json();

        if (!data.success) {
            alert(data.message || "Failed to suspend user.");
            return;
        }

        loadUsers();

    } catch (error) {

        console.error(error);

        alert("Failed to suspend user.");

    }

};

// =========================
// UNSUSPEND USER
// =========================
window.unbanUser = async function(userId) {

    try {

        await fetch(
            `http://localhost:3000/api/admin/users/${userId}/unsuspend`,
            {
                method: "PUT"
            }
        );

        loadUsers();

    } catch (error) {

        console.error(error);

        alert("Failed to unban user.");

    }

};

if (userSearch) {

    userSearch.addEventListener("input", function() {

        const value = this.value.toLowerCase();

        const filtered = allUsers.filter(user =>
            user.fullname.toLowerCase().includes(value) ||
            user.email.toLowerCase().includes(value)
        );

        renderUsers(filtered);

    });

}

// =========================
// LOAD REVIEWS
// =========================
async function loadReviews() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/reviews/admin/all"
        );

        const reviews = await response.json();

        const tbody = document.getElementById("reviewsTableBody");

        tbody.innerHTML = "";

        if (!reviews.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="6">No reviews found.</td>
                </tr>
            `;

            return;

        }

        reviews.forEach(r => {

            tbody.innerHTML += `
                <tr>
                    <td>${r.product_name}</td>
                    <td>${r.fullname}</td>
                    <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
                    <td>${r.review}</td>
                    <td>${new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteReview(${r.id})">
                            Delete
                        </button>
                    </td>
                </tr>
            `;

        });

    } catch (err) {

        console.error(err);

    }

}

const messagesTableBody =
    document.getElementById("messagesTableBody");

// =========================
// LOAD CONTACT MESSAGES
// =========================
async function loadMessages() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/contact/admin"
        );

        const messages = await response.json();

        renderMessages(messages);

    } catch (err) {

        console.error(err);

        messagesTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Error loading messages
                </td>
            </tr>
        `;

    }

}

// =========================
// RENDER CONTACT MESSAGES
// =========================
function renderMessages(messages) {

    if (!messages || messages.length === 0) {

        messagesTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    No messages found
                </td>
            </tr>
        `;

        return;

    }

    messagesTableBody.innerHTML = messages.map(message => `
        <tr>

            <td>${message.name}</td>

            <td>${message.email}</td>

            <td>${message.subject || "-"}</td>

            <td>${message.message}</td>

            <td>
                ${new Date(message.created_at).toLocaleDateString()}
            </td>

            <td>
                <button
                    class="delete-btn"
                    onclick="deleteMessage(${message.id})"
                >
                    Delete
                </button>
            </td>

        </tr>
    `).join("");

}

// =========================
// DELETE CONTACT MESSAGE
// =========================
window.deleteMessage = async function(id) {

    if (!confirm("Delete this message?")) return;

    try {

        const response = await fetch(
            `http://localhost:3000/api/contact/admin/${id}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (data.success) {

            loadMessages();

        } else {

            alert("Failed to delete message.");

        }

    } catch (err) {

        console.error(err);

        alert("Server error.");

    }

};

// =========================
// DELETE REVIEW
// =========================
async function deleteReview(id) {

    if (!confirm("Delete this review?")) return;

    const response = await fetch(
        `http://localhost:3000/api/reviews/admin/${id}`,
        {
            method: "DELETE"
        }
    );

    const data = await response.json();

    if (data.success) {

        loadReviews();

    }

}

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadOrders();
    loadUsers();
    loadReviews();
    loadMessages();
});