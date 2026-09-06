let allProducts = [];

// =========================================================
// PAGINATION
// =========================================================

const PRODUCTS_PER_PAGE = 12;
let currentPage = 1;
let filteredProducts = [];

const container = document.getElementById("product-container");
const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");
const sortFilter = document.getElementById("sort-filter");


// =========================================================
// PRODUCT IMAGE
// =========================================================

function getProductImage(image) {

    if (!image) {
        return `${API_BASE_URL}/images/products/no-image.png`;
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
    }

    return `${API_BASE_URL}/${image.replace(/^\/+/, "")}`;
}


// =========================================================
// TOAST
// =========================================================

function showToast(message, type = "success") {

    let toast = document.getElementById("toast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "toast";

        document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.className = `show ${type}`;

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


// =========================================================
// GET CURRENT USER
// =========================================================

function getCurrentUser() {

    try {

        return JSON.parse(
            localStorage.getItem("currentUser")
        );

    } catch (error) {

        return null;

    }
}


// =========================================================
// UPDATE NAVBAR CART COUNT
// =========================================================

async function updateCartCount() {

    const badge = document.getElementById("cart-count");

    if (!badge) return;

    const user = getCurrentUser();

    // Guest user
    if (!user || !user.id) {

        badge.textContent = "0";

        badge.style.display = "none";

        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/cart/${user.id}`
        );

        if (!response.ok) {

            throw new Error("Failed to load cart");

        }

        const data = await response.json();

        const totalItems =
            (data.items || []).reduce(
                (sum, item) =>
                    sum + Number(item.quantity || 0),
                0
            );

        badge.textContent = totalItems;

        badge.style.display =
            totalItems > 0 ? "flex" : "none";

    } catch (error) {

        console.error(
            "Cart count error:",
            error
        );

        badge.textContent = "0";

        badge.style.display = "none";
    }
}


// =========================================================
// ADD PRODUCT TO CART
// =========================================================

async function addToCart(product) {

    const user = getCurrentUser();

    if (!user || !user.id) {

        showToast(
            "Please log in before adding items to your cart.",
            "error"
        );

        setTimeout(() => {

            window.location.href = "login.html";

        }, 800);

        return false;
    }

    if (Number(product.stock) <= 0) {

        showToast(
            "This product is out of stock.",
            "error"
        );

        return false;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/cart/add`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    user_id: user.id,

                    product_id: product.id,

                    quantity: 1,

                    size: product.size || null

                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to add product to cart"
            );

        }

        await updateCartCount();

        showToast(
            `${product.name} added to cart!`,
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "Add to cart error:",
            error
        );

        showToast(
            error.message ||
            "Failed to add product to cart.",
            "error"
        );

        return false;
    }
}


// =========================================================
// RENDER PRODUCTS WITH PAGINATION
// =========================================================

function renderProducts(products) {

    if (!container) return;

    filteredProducts = products;

    // Make sure current page is still valid
    const totalPages = Math.ceil(
        filteredProducts.length / PRODUCTS_PER_PAGE
    );

    if (totalPages === 0) {
        currentPage = 1;
    } else if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    // =====================================================
    // NO PRODUCTS
    // =====================================================

    if (!filteredProducts.length) {

        container.innerHTML = `
            <div class="no-products">
                <h3>No products found</h3>
                <p>Try another search or category.</p>
            </div>
        `;

        renderPagination();

        return;
    }

    // =====================================================
    // GET ONLY 12 PRODUCTS FOR CURRENT PAGE
    // =====================================================

    const startIndex =
        (currentPage - 1) * PRODUCTS_PER_PAGE;

    const endIndex =
        startIndex + PRODUCTS_PER_PAGE;

    const pageProducts =
        filteredProducts.slice(
            startIndex,
            endIndex
        );

    // =====================================================
    // RENDER PRODUCT CARDS
    // =====================================================

    container.innerHTML = "";

    pageProducts.forEach(product => {

        const stockBadge =
            Number(product.stock) > 0
                ? `
                    <p class="stock in-stock">
                        In Stock (${product.stock})
                    </p>
                  `
                : `
                    <p class="stock out-stock">
                        Out of Stock
                    </p>
                  `;

        container.innerHTML += `
            <div
                class="pro"
                data-product-id="${product.id}"
            >

                <img
                    src="${getProductImage(product.image)}"
                    alt="${product.name}"
                    loading="lazy"
                >

                <div class="des">

                    <span>
                        ${product.brand || ""}
                    </span>

                    <h5>
                        ${product.name}
                    </h5>

                    <div class="star">
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>

                    <h4>
                        ₱${Number(product.price).toLocaleString()}
                    </h4>

                    ${stockBadge}

                </div>

                <button
                    class="cart ${Number(product.stock) <= 0 ? "disabled" : ""}"
                    type="button"
                    aria-label="View ${product.name}"
                >
                    <i class="fas fa-shopping-cart"></i>
                </button>

            </div>
        `;
    });

    // IMPORTANT:
    // Use pageProducts, not the complete filtered list.
    addEvents(pageProducts);

    // Create pagination buttons
    renderPagination();
}

// =========================================================
// RENDER PAGINATION BUTTONS
// =========================================================

function renderPagination() {

    if (!pagination) return;

    const totalPages = Math.ceil(
        filteredProducts.length / PRODUCTS_PER_PAGE
    );

    // Hide pagination when there is only one page
    if (totalPages <= 1) {

        pagination.innerHTML = "";

        return;
    }

    let html = "";

    // =====================================================
    // PREVIOUS ARROW
    // =====================================================

    if (currentPage > 1) {

        html += `
            <a href="#" data-page="${currentPage - 1}">
                <i class="fas fa-long-arrow-alt-left"></i>
            </a>
        `;
    }

    // =====================================================
    // PAGE NUMBERS
    // =====================================================

    for (let page = 1; page <= totalPages; page++) {

        html += `
            <a
                href="#"
                data-page="${page}"
                class="${page === currentPage ? "active" : ""}"
            >
                ${page}
            </a>
        `;
    }

    // =====================================================
    // NEXT ARROW
    // =====================================================

    if (currentPage < totalPages) {

        html += `
            <a href="#" data-page="${currentPage + 1}">
                <i class="fas fa-long-arrow-alt-right"></i>
            </a>
        `;
    }

    pagination.innerHTML = html;

    // =====================================================
    // PAGINATION CLICK EVENTS
    // =====================================================

    pagination
        .querySelectorAll("a[data-page]")
        .forEach(button => {

            button.addEventListener("click", event => {

                event.preventDefault();

                const page =
                    Number(button.dataset.page);

                if (!page) return;

                currentPage = page;

                renderProducts(filteredProducts);

                // Scroll back to products
                document.getElementById("product1")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            });

        });
}


// =========================================================
// PRODUCT EVENTS
// =========================================================

function addEvents(products) {

    document
        .querySelectorAll(".pro")
        .forEach((card, index) => {

            const product = products[index];

            // Product card
            card.addEventListener("click", () => {

                window.location.href =
                    `product.html?id=${product.id}`;

            });


            // Cart button
            // Cart button
            const cartBtn =
                card.querySelector(".cart");

            if (!cartBtn) return;

            cartBtn.addEventListener(
                "click",
                (event) => {
                
                    event.preventDefault();
                    event.stopPropagation();
                
                    // Do NOT add directly to cart.
                    // Send the customer to the product page
                    // so they can choose size and quantity.
                
                    window.location.href =
                        `product.html?id=${product.id}`;
                }
            );

                    });
            }


// =========================================================
// LOAD PRODUCTS
// =========================================================

async function loadProducts() {

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

        allProducts =
            await response.json();
            
        currentPage = 1;
            
        renderProducts(allProducts);

        await updateCartCount();

    } catch (error) {

        console.error(
            "Failed to load products:",
            error
        );

        if (container) {

            container.innerHTML = `
                <div class="no-products">
                    <h3>Unable to load products</h3>
                    <p>Please refresh the page.</p>
                </div>
            `;

        }

    }
}


// =========================================================
// FILTER + SEARCH
// =========================================================

function applyFilters() {

    let filtered =
        [...allProducts];

    const keyword =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const category =
        categoryFilter
            ? categoryFilter.value
            : "All";

    const sort =
        sortFilter
            ? sortFilter.value
            : "newest";


    // Search

    if (keyword) {

        filtered =
            filtered.filter(product =>

                String(product.name || "")
                    .toLowerCase()
                    .includes(keyword)

                ||

                String(product.brand || "")
                    .toLowerCase()
                    .includes(keyword)

                ||

                String(product.category || "")
                    .toLowerCase()
                    .includes(keyword)

            );

    }


    // Category

    if (category !== "All") {

        filtered =
            filtered.filter(product =>

                product.category === category

            );

    }


    // Sorting

    switch (sort) {

        case "low-high":

            filtered.sort(
                (a, b) =>
                    Number(a.price) -
                    Number(b.price)
            );

            break;


        case "high-low":

            filtered.sort(
                (a, b) =>
                    Number(b.price) -
                    Number(a.price)
            );

            break;


        case "name":

            filtered.sort(
                (a, b) =>
                    String(a.name)
                        .localeCompare(
                            String(b.name)
                        )
            );

            break;


        case "newest":

        default:

            filtered.sort(
                (a, b) =>
                    Number(b.id) -
                    Number(a.id)
            );

            break;
    }


    currentPage = 1;
    renderProducts(filtered);
}


// =========================================================
// EVENTS
// =========================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        applyFilters
    );

}

if (categoryFilter) {

    categoryFilter.addEventListener(
        "change",
        applyFilters
    );

}

if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        applyFilters
    );

}


// =========================================================
// START
// =========================================================

loadProducts();