let salesChart;

// =========================
// ADMIN AUTH PROTECTION
// =========================

const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
);

if (!currentUser) {
    window.location.href = "login.html";
    throw new Error("Not logged in — redirecting.");
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
            <h1 style="color:#dc2626;">
                Access Denied
            </h1>

            <p>
                This page is only available for administrators and owners.
            </p>

            <a href="index.html" style="
                margin-top:20px;
                padding:12px 20px;
                background:#088178;
                color:#fff;
                text-decoration:none;
                border-radius:8px;
            ">
                Return to Home
            </a>
        </div>
    `;

    throw new Error(
        "Unauthorized — access denied."
    );
}

const adminNameElement =
    document.getElementById("adminName");

if (adminNameElement) {
    adminNameElement.textContent =
        currentUser.fullname || "Admin";
}

const tableBody =
    document.getElementById(
        "productsTableBody"
    );

// =========================
// PRODUCT MODAL ELEMENTS
// =========================

const addProductBtn =
    document.getElementById(
        "addProductBtn"
    );

const productModal =
    document.getElementById(
        "productModal"
    );

const closeModal =
    document.getElementById(
        "closeModal"
    );

const productForm =
    document.getElementById(
        "productForm"
    );

const productIdInput =
    document.getElementById(
        "productId"
    );

const imageFile =
    document.getElementById(
        "imageFile"
    );

const imagePreview =
    document.getElementById(
        "imagePreview"
    );

const imageInput =
    document.getElementById(
        "image"
    );

const saveProductBtn =
    productForm
        ? productForm.querySelector(
            ".save-btn"
        )
        : null;

// Tracks whether Cloudinary is uploading
let imageUploading = false;

// Prevents an older upload from
// affecting a newer selected image
let uploadVersion = 0;

// =========================
// TOASTS
// =========================

function showToast(
    message,
    type = "default"
) {
    const stack =
        document.getElementById(
            "toast-stack"
        );

    if (!stack) return;

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast toast--${type}`;

    toast.textContent =
        message;

    stack.appendChild(
        toast
    );

    setTimeout(() => {

        toast.classList.add(
            "is-leaving"
        );

        toast.addEventListener(
            "animationend",
            () => toast.remove(),
            { once: true }
        );

    }, 2600);
}

// =========================
// PRODUCT FORM HELPERS
// =========================

function clearImageState() {

    uploadVersion++;

    imageUploading = false;

    if (imageInput) {
        imageInput.value = "";
    }

    if (imageFile) {
        imageFile.value = "";
        imageFile.required = true;
    }

    if (imagePreview) {
        imagePreview.src = "";
        imagePreview.style.display =
            "none";
    }

    if (saveProductBtn) {
        saveProductBtn.disabled = false;
        saveProductBtn.textContent =
            "Save Product";
    }
}

function resetProductForm() {

    if (productForm) {
        productForm.reset();
    }

    if (productIdInput) {
        productIdInput.value = "";
    }

    clearImageState();

    const modalTitle =
        document.querySelector(
            ".modal-header h2"
        );

    if (modalTitle) {
        modalTitle.textContent =
            "Add New Product";
    }
}

function setExistingImage(
    imageUrl
) {

    if (!imageUrl) {

        clearImageState();

        if (imageFile) {
            imageFile.required = true;
        }

        return;
    }

    imageUploading = false;

    if (imageInput) {
        imageInput.value =
            imageUrl;
    }

    if (imageFile) {
        imageFile.value = "";
        imageFile.required = false;
    }

    if (imagePreview) {

        imagePreview.src =
            imageUrl;

        imagePreview.style.display =
            "block";

        imagePreview.onerror = () => {

            imagePreview.style.display =
                "none";

            showToast(
                "Existing product image could not be previewed.",
                "error"
            );
        };
    }

    if (saveProductBtn) {
        saveProductBtn.disabled =
            false;

        saveProductBtn.textContent =
            "Save Product";
    }
}

// =========================
// ADD PRODUCT BUTTON
// =========================

if (
    addProductBtn &&
    productModal
) {

    addProductBtn.addEventListener(
        "click",
        () => {

            resetProductForm();

            productModal.classList.add(
                "active"
            );

        }
    );
}

// =========================
// CLOSE PRODUCT MODAL
// =========================

if (
    closeModal &&
    productModal
) {

    closeModal.addEventListener(
        "click",
        () => {

            productModal.classList.remove(
                "active"
            );

        }
    );
}

// Close product modal
// when clicking outside
window.addEventListener(
    "click",
    (e) => {

        if (
            e.target ===
            productModal
        ) {

            productModal.classList.remove(
                "active"
            );

        }

    }
);

// =========================
// LOAD PRODUCTS
// =========================

async function loadProducts() {

    if (!tableBody) return;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/products`
            );

        if (!response.ok) {

            throw new Error(
                `Server responded ${response.status}`
            );
        }

        const products =
            await response.json();

        // Total products
        const totalProductsElement =
            document.getElementById(
                "totalProducts"
            );

        if (totalProductsElement) {
            totalProductsElement.textContent =
                products.length;
        }

        // Low stock
        const lowStock =
            products.filter(
                p =>
                    Number(p.stock) <= 5
            ).length;

        const lowStockElement =
            document.getElementById(
                "lowStock"
            );

        if (lowStockElement) {
            lowStockElement.textContent =
                lowStock;
        }

        // Low stock alert
        const alertBanner =
            document.getElementById(
                "lowStockAlert"
            );

        if (alertBanner) {

            alertBanner.style.display =
                lowStock > 0
                    ? "block"
                    : "none";
        }

        renderProducts(
            products
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load products.",
            "error"
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    Failed to load products.
                </td>
            </tr>
        `;
    }
}

// =========================
// RENDER PRODUCTS
// =========================

function renderProducts(
    products
) {

    if (!tableBody) return;

    tableBody.innerHTML =
        products.map(
            product => `

        <tr>

            <td>
                ${product.id}
            </td>

            <td>

                ${
                    product.image
                        ? `
                            <img
                                src="${product.image}"
                                alt="${product.name}"
                                class="admin-product-image"
                                onerror="
                                    this.style.display='none';
                                    this.parentElement.innerHTML=
                                    '<span style=&quot;color:#999;&quot;>Image unavailable</span>';
                                "
                            >
                          `
                        : `
                            <span style="color:#999;">
                                No image
                            </span>
                          `
                }

            </td>

            <td>
                ${product.name}
            </td>

            <td>
                ${product.category}
            </td>

            <td>
                ₱${Number(
                    product.price
                ).toLocaleString(
                    "en-PH",
                    {
                        minimumFractionDigits:
                            2
                    }
                )}
            </td>

            <td>

                <span class="stock-badge ${
                    Number(product.stock) === 0
                        ? "out"
                        : Number(product.stock) <= 2
                            ? "critical"
                            : Number(product.stock) <= 5
                                ? "low"
                                : "normal"
                }">

                    ${
                        Number(product.stock) === 0
                            ? "Out of Stock"
                            : Number(product.stock) <= 2
                                ? `Critical (${product.stock})`
                                : Number(product.stock) <= 5
                                    ? `Low (${product.stock})`
                                    : `${product.stock}`
                    }

                </span>

            </td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editProduct(${product.id})"
                >
                    Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteProduct(${product.id})"
                >
                    Delete
                </button>

            </td>

        </tr>

    `
        ).join("");
}

// =========================
// EDIT PRODUCT
// =========================

window.editProduct =
    async function(id) {

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/products`
                );

            if (!response.ok) {

                throw new Error(
                    `Server responded ${response.status}`
                );
            }

            const products =
                await response.json();

            const product =
                products.find(
                    p => p.id == id
                );

            if (!product) {

                showToast(
                    "Product not found.",
                    "error"
                );

                return;
            }

            document.getElementById(
                "productId"
            ).value =
                product.id;

            document.getElementById(
                "name"
            ).value =
                product.name || "";

            document.getElementById(
                "brand"
            ).value =
                product.brand || "";

            document.getElementById(
                "category"
            ).value =
                product.category || "";

            document.getElementById(
                "description"
            ).value =
                product.description || "";

            document.getElementById(
                "price"
            ).value =
                product.price || "";

            document.getElementById(
                "stock"
            ).value =
                product.stock || "";

            setExistingImage(
                product.image
            );

            const modalTitle =
                document.querySelector(
                    ".modal-header h2"
                );

            if (modalTitle) {

                modalTitle.textContent =
                    "Edit Product";
            }

            if (productModal) {

                productModal.classList.add(
                    "active"
                );
            }

        } catch (error) {

            console.error(error);

            showToast(
                "Failed to load product.",
                "error"
            );
        }
    };

// =========================
// DELETE PRODUCT
// =========================

window.deleteProduct =
    async function(id) {

        const confirmed =
            confirm(
                "Are you sure you want to delete this product?"
            );

        if (!confirmed) return;

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/products/${id}`,
                    {
                        method: "DELETE"
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                showToast(
                    data.message ||
                    "Failed to delete product.",
                    "error"
                );

                return;
            }

            showToast(
                "Product deleted successfully.",
                "success"
            );

            await loadProducts();

        } catch (error) {

            console.error(error);

            showToast(
                "Server error.",
                "error"
            );
        }
    };

// =========================
// LOGOUT
// =========================

const logoutBtn =
    document.getElementById(
        "adminLogout"
    );

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "currentUser"
            );

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "login.html";

        }
    );
}

// =========================
// IMAGE UPLOAD
// =========================

if (imageFile) {

    imageFile.addEventListener(
        "change",
        async () => {

            const file =
                imageFile.files[0];

            if (!file) return;

            const thisUploadVersion =
                ++uploadVersion;

            // File type
            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showToast(
                    "Please select an image file.",
                    "error"
                );

                imageFile.value = "";

                return;
            }

            // 5 MB limit
            if (
                file.size >
                5 * 1024 * 1024
            ) {

                showToast(
                    "Image must be smaller than 5 MB.",
                    "error"
                );

                imageFile.value = "";

                return;
            }

            // Local preview
            if (imagePreview) {

                imagePreview.src =
                    URL.createObjectURL(
                        file
                    );

                imagePreview.style.display =
                    "block";
            }

            imageUploading = true;

            if (saveProductBtn) {

                saveProductBtn.disabled =
                    true;

                saveProductBtn.textContent =
                    "Uploading Image...";
            }

            const formData =
                new FormData();

            formData.append(
                "image",
                file
            );

            try {

                showToast(
                    "Uploading image...",
                    "success"
                );

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/products/upload`,
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                let data;

                try {

                    data =
                        await response.json();

                } catch (
                    jsonError
                ) {

                    throw new Error(
                        `Server returned an invalid response (${response.status}).`
                    );
                }

                // Ignore old upload
                if (
                    thisUploadVersion !==
                    uploadVersion
                ) {

                    console.log(
                        "Ignoring old image upload result."
                    );

                    return;
                }

                if (
                    !response.ok ||
                    !data.success
                ) {

                    console.error(
                        "Upload failed:",
                        data
                    );

                    imageUploading =
                        false;

                    if (saveProductBtn) {

                        saveProductBtn.disabled =
                            false;

                        saveProductBtn.textContent =
                            "Save Product";
                    }

                    showToast(
                        data.message ||
                        "Image upload failed.",
                        "error"
                    );

                    return;
                }

                if (!data.imagePath) {

                    imageUploading =
                        false;

                    if (saveProductBtn) {

                        saveProductBtn.disabled =
                            false;

                        saveProductBtn.textContent =
                            "Save Product";
                    }

                    showToast(
                        "Cloudinary did not return an image URL.",
                        "error"
                    );

                    return;
                }

                // Save Cloudinary URL
                imageInput.value =
                    data.imagePath;

                if (imagePreview) {

                    imagePreview.src =
                        data.imagePath;

                    imagePreview.style.display =
                        "block";
                }

                imageUploading =
                    false;

                if (saveProductBtn) {

                    saveProductBtn.disabled =
                        false;

                    saveProductBtn.textContent =
                        "Save Product";
                }

                console.log(
                    "✅ Cloudinary image URL:",
                    data.imagePath
                );

                showToast(
                    "Image uploaded successfully!",
                    "success"
                );

            } catch (error) {

                console.error(
                    "Cloudinary upload error:",
                    error
                );

                if (
                    thisUploadVersion ===
                    uploadVersion
                ) {

                    imageUploading =
                        false;

                    if (saveProductBtn) {

                        saveProductBtn.disabled =
                            false;

                        saveProductBtn.textContent =
                            "Save Product";
                    }

                    showToast(
                        error.message ||
                        "Cannot upload image. Please try again.",
                        "error"
                    );
                }
            }
        }
    );
}

// =========================
// ADD / UPDATE PRODUCT
// =========================

if (productForm) {

    productForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            if (imageUploading) {

                showToast(
                    "Please wait for the image upload to finish.",
                    "error"
                );

                return;
            }

            const productId =
                productIdInput.value.trim();

            const imageUrl =
                imageInput.value.trim();

            // Image required
            if (!imageUrl) {

                showToast(
                    "Please upload the product image first.",
                    "error"
                );

                return;
            }

            const price =
                parseFloat(
                    document.getElementById(
                        "price"
                    ).value
                );

            const stock =
                parseInt(
                    document.getElementById(
                        "stock"
                    ).value
                );

            const product = {

                name:
                    document.getElementById(
                        "name"
                    ).value.trim(),

                brand:
                    document.getElementById(
                        "brand"
                    ).value.trim(),

                category:
                    document.getElementById(
                        "category"
                    ).value,

                description:
                    document.getElementById(
                        "description"
                    ).value.trim(),

                price,

                stock,

                image:
                    imageUrl
            };

            // Validation
            if (!product.name) {

                showToast(
                    "Product name is required.",
                    "error"
                );

                return;
            }

            if (!product.brand) {

                showToast(
                    "Brand is required.",
                    "error"
                );

                return;
            }

            if (!product.category) {

                showToast(
                    "Please select a category.",
                    "error"
                );

                return;
            }

            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                showToast(
                    "Please enter a valid price.",
                    "error"
                );

                return;
            }

            if (
                !Number.isInteger(stock) ||
                stock < 0
            ) {

                showToast(
                    "Please enter a valid stock quantity.",
                    "error"
                );

                return;
            }

            console.log(
                "📦 Product being saved:",
                product
            );

            try {

                if (saveProductBtn) {

                    saveProductBtn.disabled =
                        true;

                    saveProductBtn.textContent =
                        "Saving...";
                }

                const response =
                    await fetch(
                        productId
                            ? `${API_BASE_URL}/api/products/${productId}`
                            : `${API_BASE_URL}/api/products`,
                        {
                            method:
                                productId
                                    ? "PUT"
                                    : "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    product
                                )
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    showToast(
                        data.message ||
                        "Failed to save product.",
                        "error"
                    );

                    if (saveProductBtn) {

                        saveProductBtn.disabled =
                            false;

                        saveProductBtn.textContent =
                            "Save Product";
                    }

                    return;
                }

                showToast(
                    productId
                        ? "Product updated successfully."
                        : "Product added successfully.",
                    "success"
                );

                resetProductForm();

                if (productModal) {

                    productModal.classList.remove(
                        "active"
                    );
                }

                await loadProducts();

            } catch (error) {

                console.error(error);

                showToast(
                    "Server error.",
                    "error"
                );

                if (saveProductBtn) {

                    saveProductBtn.disabled =
                        false;

                    saveProductBtn.textContent =
                        "Save Product";
                }
            }
        }
    );
}

// =========================================================
// ORDERS
// =========================================================

const ordersTableBody =
    document.getElementById(
        "ordersTableBody"
    );

// =========================
// LOAD ORDERS
// =========================

async function loadOrders() {

    if (!ordersTableBody) return;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/orders/admin/all`
            );

        if (!response.ok) {

            throw new Error(
                `Server responded ${response.status}`
            );
        }

        const orders =
            await response.json();

        // =================================================
        // BASIC STATISTICS
        // =================================================

        const totalOrders =
            orders.length;

        const pendingOrders =
            orders.filter(
                order =>
                    String(
                        order.status || ""
                    ).toLowerCase() ===
                    "pending"
            ).length;

        const processingOrders =
            orders.filter(
                order =>
                    String(
                        order.status || ""
                    ).toLowerCase() ===
                    "processing"
            ).length;

        const shippedOrders =
            orders.filter(
                order =>
                    String(
                        order.status || ""
                    ).toLowerCase() ===
                    "shipped"
            ).length;

        const deliveredOrders =
            orders.filter(
                order =>
                    String(
                        order.status || ""
                    ).toLowerCase() ===
                    "delivered"
            ).length;

        const cancelledOrders =
            orders.filter(
                order =>
                    String(
                        order.status || ""
                    ).toLowerCase() ===
                    "cancelled"
            ).length;

        const paidOrders =
            orders.filter(
                order =>
                    String(
                        order.payment_status ||
                        "Pending"
                    ).toLowerCase() ===
                    "paid"
            ).length;

        // =================================================
        // PAID REVENUE
        // =================================================

        const revenue =
            orders.reduce(
                (sum, order) => {

                    const paymentStatus =
                        String(
                            order.payment_status ||
                            "Pending"
                        ).toLowerCase();

                    const orderStatus =
                        String(
                            order.status ||
                            "Pending"
                        ).toLowerCase();

                    if (
                        paymentStatus ===
                            "paid" &&
                        orderStatus !==
                            "cancelled"
                    ) {

                        return (
                            sum +
                            Number(
                                order.total ||
                                0
                            )
                        );
                    }

                    return sum;
                },
                0
            );

        // =================================================
        // UPDATE DASHBOARD
        // =================================================

        const totalOrdersElement =
            document.getElementById(
                "totalOrders"
            );

        const totalRevenueElement =
            document.getElementById(
                "totalRevenue"
            );

        const pendingOrdersElement =
            document.getElementById(
                "pendingOrders"
            );

        const processingOrdersElement =
            document.getElementById(
                "processingOrders"
            );

        const shippedOrdersElement =
            document.getElementById(
                "shippedOrders"
            );

        const deliveredOrdersElement =
            document.getElementById(
                "deliveredOrders"
            );

        const paidOrdersElement =
            document.getElementById(
                "paidOrders"
            );

        const cancelledOrdersElement =
            document.getElementById(
                "cancelledOrders"
            );

        if (totalOrdersElement) {

            totalOrdersElement.textContent =
                totalOrders;
        }

        if (totalRevenueElement) {

            totalRevenueElement.textContent =
                "₱" +
                revenue.toLocaleString(
                    "en-PH",
                    {
                        minimumFractionDigits:
                            2
                    }
                );
        }

        if (pendingOrdersElement) {

            pendingOrdersElement.textContent =
                pendingOrders;
        }

        if (processingOrdersElement) {

            processingOrdersElement.textContent =
                processingOrders;
        }

        if (shippedOrdersElement) {

            shippedOrdersElement.textContent =
                shippedOrders;
        }

        if (deliveredOrdersElement) {

            deliveredOrdersElement.textContent =
                deliveredOrders;
        }

        if (paidOrdersElement) {

            paidOrdersElement.textContent =
                paidOrders;
        }

        if (cancelledOrdersElement) {

            cancelledOrdersElement.textContent =
                cancelledOrders;
        }

        // =================================================
        // SALES ANALYTICS
        // =================================================

        renderSalesChart(
            orders
        );

        // =================================================
        // ORDERS TABLE
        // =================================================

        ordersTableBody.innerHTML =
            orders.map(
                order => {

                    const paymentStatus =
                        order.payment_status ||
                        "Pending";

                    const orderStatus =
                        order.status ||
                        "Pending";

                    const paymentClass =
                        String(
                            paymentStatus
                        )
                            .toLowerCase()
                            .replace(
                                /\s+/g,
                                "-"
                            );

                    const statusClass =
                        String(
                            orderStatus
                        )
                            .toLowerCase()
                            .replace(
                                /\s+/g,
                                "-"
                            );

                    const paymentIcon =
                        paymentClass ===
                        "paid"
                            ? "fa-circle-check"
                            : paymentClass ===
                              "failed"
                                ? "fa-circle-xmark"
                                : paymentClass ===
                                  "cancelled"
                                    ? "fa-circle-xmark"
                                    : "fa-clock";

                    const statusIcon =
                        statusClass ===
                        "delivered"
                            ? "fa-circle-check"
                            : statusClass ===
                              "cancelled"
                                ? "fa-circle-xmark"
                                : statusClass ===
                                  "shipped"
                                    ? "fa-truck"
                                    : statusClass ===
                                      "processing"
                                        ? "fa-box"
                                        : "fa-clock";

                    const createdDate =
                        order.created_at
                            ? new Date(
                                order.created_at
                            ).toLocaleDateString(
                                "en-PH",
                                {
                                    year:
                                        "numeric",
                                    month:
                                        "short",
                                    day:
                                        "numeric"
                                }
                            )
                            : "N/A";

                    return `

                        <tr>

                            <!-- ORDER ID -->

                            <td>

                                <strong>
                                    ${order.order_id}
                                </strong>

                            </td>

                            <!-- CUSTOMER -->

                            <td>

                                <strong>
                                    ${
                                        order.fullname ||
                                        "Unknown Customer"
                                    }
                                </strong>

                                <br>

                                <small>
                                    ${
                                        order.email ||
                                        "No email"
                                    }
                                </small>

                            </td>

                            <!-- TOTAL -->

                            <td>

                                <strong>
                                    ₱${Number(
                                        order.total ||
                                        0
                                    ).toLocaleString(
                                        "en-PH",
                                        {
                                            minimumFractionDigits:
                                                2
                                        }
                                    )}
                                </strong>

                            </td>

                            <!-- PAYMENT METHOD -->

                            <td>

                                <span class="payment-method">

                                    <i class="fas ${
                                        String(
                                            order.payment_method ||
                                            ""
                                        ).toLowerCase() ===
                                        "cod"
                                            ? "fa-money-bill-wave"
                                            : "fa-credit-card"
                                    }"></i>

                                    ${
                                        order.payment_method ||
                                        "N/A"
                                    }

                                </span>

                            </td>

                            <!-- PAYMENT STATUS -->

                            <td>

                                <span
                                    class="payment-status ${paymentClass}"
                                >

                                    <i
                                        class="fas ${paymentIcon}"
                                    ></i>

                                    ${paymentStatus}

                                </span>

                            </td>

                            <!-- ORDER STATUS -->

                            <td>

                                <div class="order-status-wrapper">

                                    <span
                                        class="order-status-badge ${statusClass}"
                                    >

                                        <i
                                            class="fas ${statusIcon}"
                                        ></i>

                                        ${orderStatus}

                                    </span>

                                    <select
                                        class="order-status-select"
                                        onchange="
                                            updateOrderStatus(
                                                '${order.order_id}',
                                                this.value
                                            )
                                        "
                                    >

                                        <option
                                            value="Pending"
                                            ${
                                                orderStatus ===
                                                "Pending"
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            Pending
                                        </option>

                                        <option
                                            value="Processing"
                                            ${
                                                orderStatus ===
                                                "Processing"
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            Processing
                                        </option>

                                        <option
                                            value="Shipped"
                                            ${
                                                orderStatus ===
                                                "Shipped"
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            Shipped
                                        </option>

                                        <option
                                            value="Delivered"
                                            ${
                                                orderStatus ===
                                                "Delivered"
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            Delivered
                                        </option>

                                        <option
                                            value="Cancelled"
                                            ${
                                                orderStatus ===
                                                "Cancelled"
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            Cancelled
                                        </option>

                                    </select>

                                </div>

                            </td>

                            <!-- DATE -->

                            <td>
                                ${createdDate}
                            </td>

                            <!-- ACTION -->

                            <td>

                                <button
                                    class="edit-btn"
                                    type="button"
                                    onclick="
                                        viewOrder(
                                            '${order.order_id}'
                                        )
                                    "
                                >

                                    <i class="fas fa-eye"></i>

                                    View

                                </button>

                            </td>

                        </tr>

                    `;
                }
            ).join("");

        // Reapply filters after loading
        filterOrders();

    } catch (error) {

        console.error(
            "Load Orders Error:",
            error
        );

        showToast(
            "Failed to load orders.",
            "error"
        );

        ordersTableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="loading"
                >

                    <i class="fas fa-circle-exclamation"></i>

                    Failed to load orders.

                </td>

            </tr>

        `;
    }
}

// =========================================================
// SALES ANALYTICS
// =========================================================

function renderSalesChart(
    orders
) {

    const ctx =
        document.getElementById(
            "salesChart"
        );

    if (!ctx) return;

    const monthLabels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];

    // =================================================
    // AVAILABLE YEARS
    // =================================================

    const availableYears = [
        ...new Set(
            orders
                .map(order => {

                    const date =
                        new Date(
                            order.created_at
                        );

                    return Number.isNaN(
                        date.getTime()
                    )
                        ? null
                        : date.getFullYear();

                })
                .filter(
                    year =>
                        year !== null
                )
        )
    ].sort(
        (a, b) =>
            b - a
    );

    if (
        availableYears.length === 0
    ) {

        availableYears.push(
            new Date().getFullYear()
        );
    }

    // =================================================
    // YEAR DROPDOWN
    // =================================================

    const salesYearSelect =
        document.getElementById(
            "sales-year"
        );

    let selectedYear;

    if (salesYearSelect) {

        const previousValue =
            Number(
                salesYearSelect.value
            );

        salesYearSelect.innerHTML =
            availableYears
                .map(
                    year => `
                        <option
                            value="${year}"
                        >
                            ${year}
                        </option>
                    `
                )
                .join("");

        if (
            availableYears.includes(
                previousValue
            )
        ) {

            salesYearSelect.value =
                previousValue;

        } else {

            salesYearSelect.value =
                availableYears[0];
        }

        selectedYear =
            Number(
                salesYearSelect.value
            );

    } else {

        selectedYear =
            new Date().getFullYear();
    }

    // =================================================
    // MONTHLY SALES
    // =================================================

    const monthlySales =
        new Array(12).fill(0);

    orders.forEach(
        order => {

            const paymentStatus =
                String(
                    order.payment_status ||
                    "Pending"
                ).toLowerCase();

            const orderStatus =
                String(
                    order.status ||
                    "Pending"
                ).toLowerCase();

            // Only confirmed paid orders
            if (
                paymentStatus !==
                    "paid" ||
                orderStatus ===
                    "cancelled"
            ) {

                return;
            }

            const date =
                new Date(
                    order.created_at
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return;
            }

            if (
                date.getFullYear() !==
                selectedYear
            ) {

                return;
            }

            const monthIndex =
                date.getMonth();

            monthlySales[
                monthIndex
            ] += Number(
                order.total || 0
            );
        }
    );

    // =================================================
    // BEST MONTH
    // =================================================

    const highestSales =
        Math.max(
            ...monthlySales
        );

    const bestMonthIndex =
        highestSales > 0
            ? monthlySales.indexOf(
                highestSales
            )
            : -1;

    const bestMonthElement =
        document.getElementById(
            "bestSalesMonth"
        );

    if (bestMonthElement) {

        bestMonthElement.textContent =
            bestMonthIndex >= 0
                ? monthLabels[
                    bestMonthIndex
                  ]
                : "—";
    }

    const bestSalesValueElement =
        document.getElementById(
            "bestSalesValue"
        );

    if (bestSalesValueElement) {

        bestSalesValueElement.textContent =
            highestSales > 0
                ? "₱" +
                  highestSales.toLocaleString(
                      "en-PH",
                      {
                          minimumFractionDigits:
                              2
                      }
                  )
                : "₱0.00";
    }

    // =================================================
    // YEAR TOTAL
    // =================================================

    const yearlySales =
        monthlySales.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );

    const yearlySalesElement =
        document.getElementById(
            "yearlySales"
        );

    if (yearlySalesElement) {

        yearlySalesElement.textContent =
            "₱" +
            yearlySales.toLocaleString(
                "en-PH",
                {
                    minimumFractionDigits:
                        2
                }
            );
    }

    // =================================================
    // DESTROY OLD CHART
    // =================================================

    if (salesChart) {

        salesChart.destroy();

        salesChart = null;
    }

    // =================================================
    // CREATE CHART
    // =================================================

    salesChart =
        new Chart(
            ctx,
            {
                type: "bar",

                data: {

                    labels:
                        monthLabels,

                    datasets: [

                        {
                            label:
                                "Paid Sales (₱)",

                            data:
                                monthlySales,

                            backgroundColor:
                                "#088178",

                            borderRadius:
                                10,

                            borderSkipped:
                                false
                        }

                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        intersect:
                            false,

                        mode:
                            "index"
                    },

                    plugins: {

                        legend: {

                            display:
                                false
                        },

                        tooltip: {

                            callbacks: {

                                title:
                                    function(
                                        tooltipItems
                                    ) {

                                        return (
                                            tooltipItems[0]
                                                .label +
                                            " " +
                                            selectedYear
                                        );
                                    },

                                label:
                                    function(
                                        context
                                    ) {

                                        return (
                                            " Paid Sales: ₱" +
                                            Number(
                                                context.raw ||
                                                0
                                            ).toLocaleString(
                                                "en-PH",
                                                {
                                                    minimumFractionDigits:
                                                        2
                                                }
                                            )
                                        );
                                    }
                            }
                        }
                    },

                    scales: {

                        x: {

                            grid: {

                                display:
                                    false
                            }
                        },

                        y: {

                            beginAtZero:
                                true,

                            grid: {

                                color:
                                    "rgba(0,0,0,0.06)"
                            },

                            ticks: {

                                callback:
                                    function(
                                        value
                                    ) {

                                        return (
                                            "₱" +
                                            Number(
                                                value
                                            ).toLocaleString(
                                                "en-PH"
                                            )
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}

// =========================================================
// SALES YEAR CHANGE
// =========================================================

const salesYearSelect =
    document.getElementById(
        "sales-year"
    );

if (salesYearSelect) {

    salesYearSelect.addEventListener(
        "change",
        async () => {

            try {

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/orders/admin/all`
                    );

                if (!response.ok) {

                    throw new Error(
                        `Server responded ${response.status}`
                    );
                }

                const orders =
                    await response.json();

                renderSalesChart(
                    orders
                );

            } catch (error) {

                console.error(
                    "Sales year change error:",
                    error
                );

                showToast(
                    "Failed to update sales chart.",
                    "error"
                );
            }
        }
    );
}

// =========================================================
// UPDATE ORDER STATUS
// =========================================================

window.updateOrderStatus =
    async function(
        orderId,
        status
    ) {

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/orders/admin/${orderId}/status`,
                    {
                        method:
                            "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                status
                            })
                    }
                );

            if (!response.ok) {

                const data =
                    await response
                        .json()
                        .catch(
                            () => ({})
                        );

                throw new Error(
                    data.message ||
                    `Server responded ${response.status}`
                );
            }

            showToast(
                `Order marked as ${status}.`,
                "success"
            );

            // Reload orders so:
            // - dashboard stats update
            // - revenue updates
            // - chart updates
            // - badge updates
            await loadOrders();

        } catch (error) {

            console.error(
                "Update Order Status Error:",
                error
            );

            showToast(
                error.message ||
                "Failed to update order status.",
                "error"
            );

            // Reload to restore
            // correct select value
            await loadOrders();
        }
    };

// =========================================================
// VIEW ORDER DETAILS
// =========================================================

const orderModal =
    document.getElementById(
        "orderModal"
    );

const closeOrderModal =
    document.getElementById(
        "closeOrderModal"
    );

const orderDetails =
    document.getElementById(
        "orderDetails"
    );

if (closeOrderModal) {

    closeOrderModal.addEventListener(
        "click",
        () => {

            if (orderModal) {

                orderModal.classList.remove(
                    "active"
                );
            }

        }
    );
}

window.viewOrder =
    async function(
        orderId
    ) {

        if (
            !orderModal ||
            !orderDetails
        ) {

            return;
        }

        try {

            // Open modal
            orderModal.classList.add(
                "active"
            );

            orderDetails.innerHTML = `
                <div class="order-loading">

                    <i class="fas fa-spinner fa-spin"></i>

                    <p>
                        Loading order...
                    </p>

                </div>
            `;

            // Fetch order
            const response =
                await fetch(
                    `${API_BASE_URL}/api/orders/admin/${orderId}`
                );

            if (!response.ok) {

                throw new Error(
                    `Server responded ${response.status}`
                );
            }

            const data =
                await response.json();

            const order =
                data.order;

            const items =
                data.items || [];

            if (!order) {

                throw new Error(
                    "Order not found."
                );
            }

            // =================================================
            // FORMAT VALUES
            // =================================================

            const total =
                Number(
                    order.total || 0
                );

            const paymentStatus =
                order.payment_status ||
                "Pending";

            const orderStatus =
                order.status ||
                "Pending";

            const paymentClass =
                String(
                    paymentStatus
                )
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "-"
                    );

            const statusClass =
                String(
                    orderStatus
                )
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "-"
                    );

            const orderDate =
                order.created_at
                    ? new Date(
                        order.created_at
                    ).toLocaleString(
                        "en-PH",
                        {
                            year:
                                "numeric",

                            month:
                                "long",

                            day:
                                "numeric",

                            hour:
                                "numeric",

                            minute:
                                "2-digit"
                        }
                    )
                    : "N/A";

            // Modal order ID
            const modalOrderId =
                document.getElementById(
                    "modal-order-id"
                );

            if (modalOrderId) {

                modalOrderId.textContent =
                    order.order_id;
            }

            // =================================================
            // PRODUCT ROWS
            // =================================================

            const itemRows =
                items.length > 0

                    ? items.map(
                        item => {

                            const price =
                                Number(
                                    item.price ||
                                    0
                                );

                            const quantity =
                                Number(
                                    item.quantity ||
                                    0
                                );

                            const subtotal =
                                Number(
                                    item.subtotal ||
                                    price *
                                    quantity
                                );

                            return `

                                <tr>

                                    <td>

                                        <div class="admin-order-product">

                                            <strong>
                                                ${
                                                    item.product_name ||
                                                    "Unknown Product"
                                                }
                                            </strong>

                                        </div>

                                    </td>

                                    <td>

                                        ₱${price.toLocaleString(
                                            "en-PH",
                                            {
                                                minimumFractionDigits:
                                                    2
                                            }
                                        )}

                                    </td>

                                    <td>

                                        ${quantity}

                                    </td>

                                    <td>

                                        <strong>
                                            ₱${subtotal.toLocaleString(
                                                "en-PH",
                                                {
                                                    minimumFractionDigits:
                                                        2
                                                }
                                            )}
                                        </strong>

                                    </td>

                                </tr>

                            `;
                        }
                    ).join("")

                    : `

                        <tr>

                            <td
                                colspan="4"
                                class="empty-order-items"
                            >

                                No products found.

                            </td>

                        </tr>

                    `;

            // =================================================
            // RENDER ORDER DETAILS
            // =================================================

            orderDetails.innerHTML = `

                <!-- CUSTOMER INFORMATION -->

                <div class="order-detail-section">

                    <div class="order-detail-section-title">

                        <i class="fas fa-user"></i>

                        <h3>
                            Customer Information
                        </h3>

                    </div>

                    <div class="order-info">

                        <div class="order-card">

                            <span>
                                Customer
                            </span>

                            <strong>
                                ${
                                    order.fullname ||
                                    "Unknown"
                                }
                            </strong>

                        </div>

                        <div class="order-card">

                            <span>
                                Email
                            </span>

                            <strong>
                                ${
                                    order.email ||
                                    "No email"
                                }
                            </strong>

                        </div>

                    </div>

                </div>

                <!-- ORDER INFORMATION -->

                <div class="order-detail-section">

                    <div class="order-detail-section-title">

                        <i class="fas fa-receipt"></i>

                        <h3>
                            Order Information
                        </h3>

                    </div>

                    <div class="order-info">

                        <div class="order-card">

                            <span>
                                Order ID
                            </span>

                            <strong>
                                ${order.order_id}
                            </strong>

                        </div>

                        <div class="order-card">

                            <span>
                                Order Date
                            </span>

                            <strong>
                                ${orderDate}
                            </strong>

                        </div>

                        <div class="order-card">

                            <span>
                                Payment Method
                            </span>

                            <strong>
                                ${
                                    order.payment_method ||
                                    "N/A"
                                }
                            </strong>

                        </div>

                        <div class="order-card">

                            <span>
                                Payment Status
                            </span>

                            <strong
                                class="
                                    detail-status
                                    payment-status
                                    ${paymentClass}
                                "
                            >

                                <i class="fas ${
                                    paymentClass ===
                                    "paid"
                                        ? "fa-circle-check"
                                        : paymentClass ===
                                          "failed"
                                            ? "fa-circle-xmark"
                                            : "fa-clock"
                                }"></i>

                                ${paymentStatus}

                            </strong>

                        </div>

                        <div class="order-card">

                            <span>
                                Order Status
                            </span>

                            <strong
                                class="
                                    detail-status
                                    order-status
                                    ${statusClass}
                                "
                            >

                                <i class="fas ${
                                    statusClass ===
                                    "delivered"
                                        ? "fa-circle-check"
                                        : statusClass ===
                                          "cancelled"
                                            ? "fa-circle-xmark"
                                            : statusClass ===
                                              "shipped"
                                                ? "fa-truck"
                                                : statusClass ===
                                                  "processing"
                                                    ? "fa-box"
                                                    : "fa-clock"
                                }"></i>

                                ${orderStatus}

                            </strong>

                        </div>

                        <div class="order-card total-card">

                            <span>
                                Order Total
                            </span>

                            <strong>
                                ₱${total.toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits:
                                            2
                                    }
                                )}
                            </strong>

                        </div>

                    </div>

                </div>

                <!-- ORDER ITEMS -->

                <div class="order-detail-section">

                    <div class="order-detail-section-title">

                        <i class="fas fa-box-open"></i>

                        <h3>
                            Products Ordered
                        </h3>

                    </div>

                    <div class="table-wrapper">

                        <table class="order-items-table">

                            <thead>

                                <tr>

                                    <th>
                                        Product
                                    </th>

                                    <th>
                                        Price
                                    </th>

                                    <th>
                                        Qty
                                    </th>

                                    <th>
                                        Subtotal
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                ${itemRows}

                            </tbody>

                            <tfoot>

                                <tr>

                                    <td
                                        colspan="3"
                                        class="order-total-label"
                                    >
                                        Total
                                    </td>

                                    <td
                                        class="order-total-value"
                                    >
                                        ₱${total.toLocaleString(
                                            "en-PH",
                                            {
                                                minimumFractionDigits:
                                                    2
                                            }
                                        )}
                                    </td>

                                </tr>

                            </tfoot>

                        </table>

                    </div>

                </div>

            `;

        } catch (error) {

            console.error(
                "View Order Error:",
                error
            );

            orderDetails.innerHTML = `

                <div class="order-error">

                    <i class="fas fa-circle-exclamation"></i>

                    <h3>
                        Failed to load order
                    </h3>

                    <p>
                        ${error.message}
                    </p>

                </div>

            `;

            showToast(
                "Failed to load order.",
                "error"
            );
        }
    };

// Close order modal
window.addEventListener(
    "click",
    (e) => {

        if (
            orderModal &&
            e.target === orderModal
        ) {

            orderModal.classList.remove(
                "active"
            );
        }

    }
);

// =========================================================
// LOAD USERS
// =========================================================

const usersTableBody =
    document.getElementById(
        "usersTableBody"
    );

const userSearch =
    document.getElementById(
        "userSearch"
    );

let allUsers = [];

async function loadUsers() {

    if (!usersTableBody) return;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/admin/users`
            );

        if (!response.ok) {

            throw new Error(
                `Server responded ${response.status}`
            );
        }

        const users =
            await response.json();

        allUsers =
            users;

        renderUsers(
            users
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load users.",
            "error"
        );

        usersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading">
                    Failed to load users.
                </td>
            </tr>
        `;
    }
}

// =========================================================
// RENDER USERS
// =========================================================

function renderUsers(
    users
) {

    if (!usersTableBody) return;

    usersTableBody.innerHTML =
        users.map(
            user => `

            <tr>

                <td>
                    ${user.id}
                </td>

                <td>
                    ${user.fullname}
                </td>

                <td>
                    ${user.email}
                </td>

                <td>

                    <span
                        class="status-badge ${user.role}"
                    >
                        ${user.role}
                    </span>

                    ${
                        user.suspended_until
                            ? `
                                <br>

                                <span
                                    class="status-badge banned"
                                >
                                    Suspended
                                </span>
                              `
                            : ""
                    }

                </td>

                <td>
                    ${new Date(
                        user.created_at
                    ).toLocaleDateString()}
                </td>

                <td>

                    ${
                        user.role ===
                        "owner"

                            ? `

                                <span
                                    class="status-badge owner"
                                >
                                    Protected Owner
                                </span>

                              `

                            : `

                                <button
                                    class="edit-btn"
                                    onclick="
                                        toggleRole(
                                            ${user.id},
                                            '${user.role}'
                                        )
                                    "
                                >
                                    ${
                                        user.role ===
                                        "admin"
                                            ? "Make User"
                                            : "Make Admin"
                                    }
                                </button>

                                <br><br>

                                ${
                                    user.suspended_until

                                        ? `

                                            <button
                                                class="edit-btn"
                                                onclick="
                                                    unbanUser(
                                                        ${user.id}
                                                    )
                                                "
                                            >
                                                Unban
                                            </button>

                                          `

                                        : `

                                            <button
                                                class="edit-btn"
                                                onclick="
                                                    suspendUser(
                                                        ${user.id},
                                                        3
                                                    )
                                                "
                                            >
                                                Suspend 3d
                                            </button>

                                            <button
                                                class="edit-btn"
                                                onclick="
                                                    suspendUser(
                                                        ${user.id},
                                                        7
                                                    )
                                                "
                                            >
                                                Suspend 7d
                                            </button>

                                            <button
                                                class="delete-btn"
                                                onclick="
                                                    suspendUser(
                                                        ${user.id},
                                                        'permanent'
                                                    )
                                                "
                                            >
                                                Permanent Ban
                                            </button>

                                          `
                                }

                              `
                    }

                </td>

            </tr>

        `
        ).join("");
}

// =========================================================
// TOGGLE USER ROLE
// =========================================================

window.toggleRole =
    async function(
        userId,
        currentRole
    ) {

        const newRole =
            currentRole === "admin"
                ? "user"
                : "admin";

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/admin/users/${userId}/role`,
                    {
                        method:
                            "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                role:
                                    newRole,

                                adminRole:
                                    currentUser.role
                            })
                    }
                );

            const data =
                await response.json();

            if (!data.success) {

                showToast(
                    data.message ||
                    "Failed to update role.",
                    "error"
                );

                return;
            }

            showToast(
                `Role updated to ${newRole}.`,
                "success"
            );

            loadUsers();

        } catch (error) {

            console.error(error);

            showToast(
                "Failed to update role.",
                "error"
            );
        }
    };

// =========================================================
// SUSPEND USER
// =========================================================

window.suspendUser =
    async function(
        userId,
        days
    ) {

        const label =
            days === "permanent"
                ? "permanently ban"
                : `suspend for ${days} days`;

        if (
            !confirm(
                `Are you sure you want to ${label} this user?`
            )
        ) {

            return;
        }

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/admin/users/${userId}/suspend`,
                    {
                        method:
                            "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                days,

                                adminRole:
                                    currentUser.role
                            })
                    }
                );

            const data =
                await response.json();

            if (!data.success) {

                showToast(
                    data.message ||
                    "Failed to suspend user.",
                    "error"
                );

                return;
            }

            showToast(
                "User suspended.",
                "success"
            );

            loadUsers();

        } catch (error) {

            console.error(error);

            showToast(
                "Failed to suspend user.",
                "error"
            );
        }
    };

// =========================================================
// UNBAN USER
// =========================================================

window.unbanUser =
    async function(
        userId
    ) {

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/admin/users/${userId}/unsuspend`,
                    {
                        method:
                            "PUT"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    `Server responded ${response.status}`
                );
            }

            showToast(
                "User unbanned.",
                "success"
            );

            loadUsers();

        } catch (error) {

            console.error(error);

            showToast(
                "Failed to unban user.",
                "error"
            );
        }
    };

// =========================================================
// USER SEARCH
// =========================================================

if (userSearch) {

    userSearch.addEventListener(
        "input",
        function() {

            const value =
                this.value
                    .toLowerCase()
                    .trim();

            const filtered =
                allUsers.filter(
                    user =>

                        String(
                            user.fullname ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                value
                            )

                        ||

                        String(
                            user.email ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                value
                            )
                );

            renderUsers(
                filtered
            );
        }
    );
}

// =========================================================
// LOAD REVIEWS
// =========================================================

async function loadReviews() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/reviews/admin/all`
            );

        if (!response.ok) {

            throw new Error(
                `Server responded ${response.status}`
            );
        }

        const reviews =
            await response.json();

        const tbody =
            document.getElementById(
                "reviewsTableBody"
            );

        if (!tbody) return;

        if (!reviews.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        No reviews found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            reviews.map(
                r => `

                <tr>

                    <td>
                        ${r.product_name}
                    </td>

                    <td>
                        ${r.fullname}
                    </td>

                    <td>
                        ${"★".repeat(
                            r.rating
                        )}
                        ${"☆".repeat(
                            5 - r.rating
                        )}
                    </td>

                    <td>
                        ${r.review}
                    </td>

                    <td>
                        ${new Date(
                            r.created_at
                        ).toLocaleDateString()}
                    </td>

                    <td>

                        <button
                            class="delete-btn"
                            onclick="
                                deleteReview(
                                    ${r.id}
                                )
                            "
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `
            ).join("");

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load reviews.",
            "error"
        );
    }
}

// =========================================================
// DELETE REVIEW
// =========================================================

window.deleteReview =
    async function(
        id
    ) {

        if (
            !confirm(
                "Delete this review?"
            )
        ) {

            return;
        }

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/reviews/admin/${id}`,
                    {
                        method:
                            "DELETE"
                    }
                );

            const data =
                await response.json();

            if (data.success) {

                showToast(
                    "Review deleted.",
                    "success"
                );

                loadReviews();

            } else {

                showToast(
                    "Failed to delete review.",
                    "error"
                );
            }

        } catch (error) {

            console.error(error);

            showToast(
                "Server error.",
                "error"
            );
        }
    };

// =========================================================
// CONTACT MESSAGES
// =========================================================

const messagesTableBody =
    document.getElementById(
        "messagesTableBody"
    );

// =========================================================
// LOAD CONTACT MESSAGES
// =========================================================

async function loadMessages() {

    if (!messagesTableBody) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/contact/admin`
            );

        if (!response.ok) {

            throw new Error(
                `Server responded ${response.status}`
            );
        }

        const messages =
            await response.json();

        renderMessages(
            messages
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load messages.",
            "error"
        );

        messagesTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Error loading messages
                </td>
            </tr>
        `;
    }
}

// =========================================================
// DELETE CONTACT MESSAGE
// =========================================================

window.deleteMessage =
    async function(
        id
    ) {

        if (
            !confirm(
                "Delete this message?"
            )
        ) {

            return;
        }

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/contact/admin/${id}`,
                    {
                        method:
                            "DELETE"
                    }
                );

            const data =
                await response.json();

            if (data.success) {

                showToast(
                    "Message deleted.",
                    "success"
                );

                loadMessages();

            } else {

                showToast(
                    "Failed to delete message.",
                    "error"
                );
            }

        } catch (error) {

            console.error(error);

            showToast(
                "Server error.",
                "error"
            );
        }
    };

// =========================================================
// RENDER CONTACT MESSAGES
// =========================================================

function renderMessages(
    messages
) {

    if (
        !messagesTableBody
    ) {

        return;
    }

    if (
        !messages ||
        messages.length === 0
    ) {

        messagesTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    No messages found
                </td>
            </tr>
        `;

        return;
    }

    messagesTableBody.innerHTML =
        messages.map(
            message => `

            <tr>

                <td>
                    ${message.name}
                </td>

                <td>
                    ${message.email}
                </td>

                <td>
                    ${message.subject || "-"}
                </td>

                <td>
                    ${message.message}
                </td>

                <td>
                    ${new Date(
                        message.created_at
                    ).toLocaleDateString()}
                </td>

                <td>

                    <button
                        class="delete-btn"
                        onclick="
                            deleteMessage(
                                ${message.id}
                            )
                        "
                    >
                        Delete
                    </button>

                </td>

            </tr>

        `
        ).join("");
}

// =========================================================
// SIDEBAR ACTIVE STATE
// =========================================================

document
    .querySelectorAll(
        ".sidebar-nav a"
    )
    .forEach(
        link => {

            link.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".sidebar-nav a"
                        )
                        .forEach(
                            a =>
                                a.classList.remove(
                                    "active"
                                )
                        );

                    link.classList.add(
                        "active"
                    );
                }
            );
        }
    );

// =========================================================
// ORDER SEARCH & FILTERS
// =========================================================

function filterOrders() {

    if (!ordersTableBody) {
        return;
    }

    // IMPORTANT:
    // These IDs match your admin.html

    const searchInput =
        document.getElementById(
            "order-search"
        );

    const statusFilter =
        document.getElementById(
            "status-filter"
        );

    const paymentFilter =
        document.getElementById(
            "payment-status-filter"
        );

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";

    const selectedPayment =
        paymentFilter
            ? paymentFilter.value
            : "all";

    const rows =
        ordersTableBody.querySelectorAll(
            "tr"
        );

    rows.forEach(
        row => {

            const text =
                row.textContent
                    .toLowerCase();

            // Order status
            const statusSelect =
                row.querySelector(
                    ".order-status-select"
                ) ||
                row.querySelector(
                    "select"
                );

            const rowStatus =
                statusSelect
                    ? statusSelect.value
                    : "";

            // Payment status
            const paymentElement =
                row.querySelector(
                    ".payment-status"
                );

            const rowPayment =
                paymentElement
                    ? paymentElement.textContent
                        .trim()
                        .toLowerCase()
                    : "";

            const matchesSearch =
                !search ||
                text.includes(
                    search
                );

            const matchesStatus =
                selectedStatus ===
                    "all" ||
                selectedStatus ===
                    "" ||
                rowStatus.toLowerCase() ===
                    selectedStatus.toLowerCase();

            const matchesPayment =
                selectedPayment ===
                    "all" ||
                selectedPayment ===
                    "" ||
                rowPayment ===
                    selectedPayment.toLowerCase();

            row.style.display =
                matchesSearch &&
                matchesStatus &&
                matchesPayment
                    ? ""
                    : "none";
        }
    );
}

// =========================================================
// CONNECT ORDER FILTERS
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const searchInput =
            document.getElementById(
                "order-search"
            );

        const statusFilter =
            document.getElementById(
                "status-filter"
            );

        const paymentFilter =
            document.getElementById(
                "payment-status-filter"
            );

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                filterOrders
            );
        }

        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                filterOrders
            );
        }

        if (paymentFilter) {

            paymentFilter.addEventListener(
                "change",
                filterOrders
            );
        }

        // Initial filter
        filterOrders();
    }
);

// =========================================================
// REFRESH ORDERS BUTTON
// =========================================================

const refreshOrdersBtn =
    document.getElementById(
        "refresh-orders"
    );

if (refreshOrdersBtn) {

    refreshOrdersBtn.addEventListener(
        "click",
        async () => {

            const originalHTML =
                refreshOrdersBtn.innerHTML;

            refreshOrdersBtn.disabled =
                true;

            refreshOrdersBtn.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Refreshing...
            `;

            try {

                await loadOrders();

                showToast(
                    "Orders refreshed successfully.",
                    "success"
                );

            } catch (error) {

                console.error(error);

                showToast(
                    "Failed to refresh orders.",
                    "error"
                );

            } finally {

                refreshOrdersBtn.disabled =
                    false;

                refreshOrdersBtn.innerHTML =
                    originalHTML;
            }
        }
    );
}

// =========================================================
// INITIAL LOAD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadProducts();

        loadOrders();

        loadUsers();

        loadReviews();

        loadMessages();

    }
);