let salesChart;

// =========================
// ADMIN AUTH PROTECTION
// =========================

const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// Single consolidated guard, with an actual `return`-equivalent (script
// execution stops via the thrown error) so nothing below this block can
// run for an unauthorized or logged-out user. Old version had 3 separate
// checks stacked with no early exit, so a logged-out user would trigger
// two alert()s AND then crash on `currentUser.role` being read off null.
if (!currentUser) {

    window.location.href = "login.html";
    throw new Error("Not logged in — redirecting.");

}

if (currentUser.role !== "admin" && currentUser.role !== "owner") {

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
    throw new Error("Unauthorized — access denied.");

}

document.getElementById("adminName").textContent =
    currentUser.fullname || "Admin";

const tableBody = document.getElementById("productsTableBody");

// =========================
// TOASTS (replaces alert() for non-blocking feedback)
// =========================
function showToast(message, type = "default") {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("animationend", () => toast.remove());
    }, 2600);
}

// Load products from database
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const products = await response.json();

        document.getElementById("totalProducts").textContent = products.length;

        const lowStock = products.filter(p => Number(p.stock) <= 5).length;
        document.getElementById("lowStock").textContent = lowStock;

        const alertBanner = document.getElementById("lowStockAlert");

        if (alertBanner) {
            alertBanner.style.display = lowStock > 0 ? "block" : "none";
        }

        renderProducts(products);

    } catch (error) {
        console.error(error);
        showToast("Failed to load products.", "error");

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
        const response = await fetch(`${API_BASE_URL}/api/products`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const products = await response.json();
        const product = products.find(p => p.id == id);

        if (!product) {
            showToast("Product not found.", "error");
            return;
        }

        document.getElementById("productId").value = product.id;
        document.getElementById("name").value = product.name;
        document.getElementById("brand").value = product.brand;
        document.getElementById("category").value = product.category;
        document.getElementById("description").value = product.description;
        document.getElementById("price").value = product.price;
        document.getElementById("stock").value = product.stock;
        document.getElementById("image").value = product.image;

        document.querySelector(".modal-header h2").textContent = "Edit Product";
        productModal.classList.add("active");

    } catch (error) {
        console.error(error);
        showToast("Failed to load product.", "error");
    }
};

// Temporary delete function
window.deleteProduct = async function(id) {

    const confirmed = confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;

    try {

        const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || "Failed to delete product.", "error");
            return;
        }

        showToast("Product deleted successfully.", "success");
        loadProducts();

    } catch (error) {
        console.error(error);
        showToast("Server error.", "error");
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

        // Check file type
        if (!file.type.startsWith("image/")) {
            showToast("Please select an image file.", "error");
            imageFile.value = "";
            return;
        }

        // Maximum 5 MB
        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be smaller than 5 MB.", "error");
            imageFile.value = "";
            return;
        }

        // Show preview immediately
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";

        const formData = new FormData();
        formData.append("image", file);

        try {
            showToast("Uploading image...", "success");

            const response = await fetch(
                `${API_BASE_URL}/api/products/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error("Upload failed:", data);

                showToast(
                    data.message || "Image upload failed.",
                    "error"
                );

                return;
            }

            // Save Cloudinary URL in hidden input
            imageInput.value = data.imagePath;

            // Use Cloudinary URL for preview
            imagePreview.src = data.imagePath;

            showToast("Image uploaded successfully!", "success");

        } catch (error) {
            console.error("Cloudinary upload error:", error);

            showToast(
                "Cannot upload image. Please try again.",
                "error"
            );
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
                    ? `${API_BASE_URL}/api/products/${productId}`
                    : `${API_BASE_URL}/api/products`,
                {
                    method: productId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(product)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Failed to save product.", "error");
                return;
            }

            showToast("Product saved successfully.", "success");

            productForm.reset();
            document.getElementById("productId").value = "";
            document.querySelector(".modal-header h2").textContent = "Add New Product";
            imagePreview.style.display = "none";

            productModal.classList.remove("active");
            loadProducts();

        } catch (error) {
            console.error(error);
            showToast("Server error.", "error");
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

        const response = await fetch(`${API_BASE_URL}/api/orders/admin/all`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const orders = await response.json();

        document.getElementById("totalOrders").textContent = orders.length;

        const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
        document.getElementById("totalRevenue").textContent = "₱" + revenue.toLocaleString();

        const monthlySales = {};

        orders.forEach(order => {
            const date = new Date(order.created_at);
            const month = date.toLocaleString("default", { month: "short" });
            monthlySales[month] = (monthlySales[month] || 0) + Number(order.total);
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
                    plugins: { legend: { display: false } }
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
                    <button class="edit-btn" onclick="viewOrder('${order.order_id}')">View</button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error(error);
        showToast("Failed to load orders.", "error");

        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading">Failed to load orders.</td>
            </tr>
        `;
    }

}

window.updateOrderStatus = async function(orderId, status) {

    try {

        const response = await fetch(`${API_BASE_URL}/api/orders/admin/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        showToast(`Order marked as ${status}.`, "success");

    } catch (error) {
        console.error(error);
        showToast("Failed to update order status.", "error");
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

        const response = await fetch(`${API_BASE_URL}/api/orders/admin/${orderId}`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const data = await response.json();
        const order = data.order;
        const items = data.items;

        orderDetails.innerHTML = `
            <div class="order-info">
                <div class="order-card"><h4>Order ID</h4><p>${order.order_id}</p></div>
                <div class="order-card"><h4>Customer</h4><p>${order.fullname}</p></div>
                <div class="order-card"><h4>Email</h4><p>${order.email}</p></div>
                <div class="order-card"><h4>Payment</h4><p>${order.payment_method}</p></div>
                <div class="order-card"><h4>Status</h4><p>${order.status}</p></div>
                <div class="order-card"><h4>Total</h4><p>₱${Number(order.total).toLocaleString()}</p></div>
            </div>

            <table class="order-items-table">
                <thead>
                    <tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr>
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
        showToast("Failed to load order.", "error");
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

        const response = await fetch(`${API_BASE_URL}/api/admin/users`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const users = await response.json();
        allUsers = users;
        renderUsers(users);

    } catch (error) {
        console.error(error);
        showToast("Failed to load users.", "error");

        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading">Failed to load users.</td>
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

    const newRole = currentRole === "admin" ? "user" : "admin";

    try {

        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole, adminRole: currentUser.role })
        });

        const data = await response.json();

        if (!data.success) {
            showToast(data.message || "Failed to update role.", "error");
            return;
        }

        showToast(`Role updated to ${newRole}.`, "success");
        loadUsers();

    } catch (error) {
        console.error(error);
        showToast("Failed to update role.", "error");
    }

};

window.suspendUser = async function(userId, days) {

    const label = days === "permanent" ? "permanently ban" : `suspend for ${days} days`;
    if (!confirm(`Are you sure you want to ${label} this user?`)) return;

    try {

        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/suspend`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days, adminRole: currentUser.role })
        });

        const data = await response.json();

        if (!data.success) {
            showToast(data.message || "Failed to suspend user.", "error");
            return;
        }

        showToast("User suspended.", "success");
        loadUsers();

    } catch (error) {
        console.error(error);
        showToast("Failed to suspend user.", "error");
    }

};

window.unbanUser = async function(userId) {

    try {

        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/unsuspend`, {
            method: "PUT"
        });

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        showToast("User unbanned.", "success");
        loadUsers();

    } catch (error) {
        console.error(error);
        showToast("Failed to unban user.", "error");
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

        const response = await fetch(`${API_BASE_URL}/api/reviews/admin/all`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const reviews = await response.json();
        const tbody = document.getElementById("reviewsTableBody");

        if (!reviews.length) {
            tbody.innerHTML = `<tr><td colspan="6">No reviews found.</td></tr>`;
            return;
        }

        // Built as an array and joined once instead of `innerHTML +=` inside
        // the loop, which re-parses the whole table body on every iteration.
        const rows = reviews.map(r => `
            <tr>
                <td>${r.product_name}</td>
                <td>${r.fullname}</td>
                <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
                <td>${r.review}</td>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="delete-btn" onclick="deleteReview(${r.id})">Delete</button>
                </td>
            </tr>
        `).join("");

        tbody.innerHTML = rows;

    } catch (err) {
        console.error(err);
        showToast("Failed to load reviews.", "error");
    }

}

async function deleteReview(id) {

    if (!confirm("Delete this review?")) return;

    try {

        const response = await fetch(`${API_BASE_URL}/api/reviews/admin/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (data.success) {
            showToast("Review deleted.", "success");
            loadReviews();
        } else {
            showToast("Failed to delete review.", "error");
        }

    } catch (err) {
        console.error(err);
        showToast("Server error.", "error");
    }

}

const messagesTableBody =
    document.getElementById("messagesTableBody");

// =========================
// LOAD CONTACT MESSAGES
// =========================
async function loadMessages() {

    try {

        const response = await fetch(`${API_BASE_URL}/api/contact/admin`);

        if (!response.ok) {
            throw new Error(`Server responded ${response.status}`);
        }

        const messages = await response.json();
        renderMessages(messages);

    } catch (err) {
        console.error(err);
        showToast("Failed to load messages.", "error");

        messagesTableBody.innerHTML = `
            <tr><td colspan="6">Error loading messages</td></tr>
        `;
    }

}

window.deleteMessage = async function(id) {

    if (!confirm("Delete this message?")) return;

    try {

        const response = await fetch(`${API_BASE_URL}/api/contact/admin/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (data.success) {
            showToast("Message deleted.", "success");
            loadMessages();
        } else {
            showToast("Failed to delete message.", "error");
        }

    } catch (err) {
        console.error(err);
        showToast("Server error.", "error");
    }

};

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

// Sidebar nav had no click-driven active state — "Dashboard" was
// hardcoded active forever regardless of which section you scrolled to.
document.querySelectorAll(".sidebar-nav a").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".sidebar-nav a").forEach(a => a.classList.remove("active"));
        link.classList.add("active");
    });
});

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadOrders();
    loadUsers();
    loadReviews();
    loadMessages();
});