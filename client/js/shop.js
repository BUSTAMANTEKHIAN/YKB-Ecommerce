let allProducts = [];

const CART_KEY = "ykb_cart";
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("drawer-overlay");
const drawerItems = document.getElementById("drawer-items");
const drawerTotal = document.getElementById("drawer-total");
const closeDrawerBtn = document.getElementById("close-drawer");
const viewCartBtn = document.getElementById("view-cart-btn");


function getProductImage(image) {
    if (!image) {
        return `${API_BASE_URL}/images/products/no-image.png`;
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
    }

    return `${API_BASE_URL}/${image.replace(/^\/+/, "")}`;
}

function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function openDrawer() {
    drawer.classList.add("active");
    overlay.classList.add("active");
}

function closeDrawer() {
    drawer.classList.remove("active");
    overlay.classList.remove("active");
}

function renderDrawer() {

    const cart = getCart();

    drawerItems.innerHTML = "";

    let total = 0;

    if (cart.length === 0) {

        drawerItems.innerHTML = `
            <p style="text-align:center;color:#888;">
                Your cart is empty.
            </p>
        `;

        drawerTotal.textContent = "₱0";

        return;
    }

    cart.forEach(item => {

        total += item.price * item.quantity;

        drawerItems.innerHTML += `
<div class="drawer-item">

    <img src="${item.image}" alt="${item.name}">

    <div class="drawer-info">

        <h4>${item.name}</h4>

        <p>₱${item.price.toLocaleString()}</p>

        <div class="drawer-controls">

            <button class="minus" data-id="${item.id}">−</button>

            <span>${item.quantity}</span>

            <button class="plus" data-id="${item.id}">+</button>

            <button class="remove" data-id="${item.id}">
                <i class="fas fa-trash"></i>
            </button>

        </div>

    </div>

</div>
`;

    });

    drawerTotal.textContent =
    "₱" + total.toLocaleString();



}

drawerItems.addEventListener("click", (e) => {

    const id = e.target.dataset.id || e.target.parentElement.dataset.id;

    if (!id) return;

    let cart = getCart();

    const item = cart.find(product => product.id === id);

    if (!item) return;

    if (e.target.classList.contains("plus")) {

        item.quantity++;

    }

    if (e.target.classList.contains("minus")) {

        item.quantity--;

        if (item.quantity <= 0) {

            cart = cart.filter(product => product.id !== id);

        }

    }

    if (
        e.target.classList.contains("remove") ||
        e.target.parentElement.classList.contains("remove")
    ) {

        cart = cart.filter(product => product.id !== id);

    }

    saveCart(cart);

    updateCartCount();

    renderDrawer();

});

function updateCartCount() {
    const cart = getCart();

    const totalItems = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    const badge = document.getElementById("cart-count");

    if (badge) {
        badge.textContent = totalItems;

        badge.classList.remove("bounce");
        void badge.offsetWidth;
        badge.classList.add("bounce");
    }
}

function showToast(message) {

    let toast = document.getElementById("toast");

    if (!toast) {

        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);

    }

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);

}


const container = document.getElementById("product-container");
console.log(container);

function renderProducts(products){

    container.innerHTML = "";

    products.forEach(product => {

        const stockBadge =
            product.stock > 0
                ? `<p class="stock in-stock">In Stock (${product.stock})</p>`
                : `<p class="stock out-stock">Out of Stock</p>`;

        container.innerHTML += `

        <div class="pro">

            <img src="${getProductImage(product.image)}"
                 alt="${product.name}"
                 loading="lazy">

            <div class="des">

                <span>${product.brand}</span>

                <h5>${product.name}</h5>

                <div class="star">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                </div>

                <h4>₱${Number(product.price).toLocaleString()}</h4>

                ${stockBadge}

            </div>

            <div class="cart ${product.stock <= 0 ? 'disabled' : ''}">
                <i class="fas fa-shopping-cart"></i>
            </div>

        </div>

        `;

    });

    addEvents(products);

}

async function loadProducts(){

    try{

        const response = await fetch(`${API_BASE_URL}/api/products`);

        allProducts = await response.json();

        renderProducts(allProducts);

    }

    catch(err){

        console.log(err);

    }

}

function addEvents(products){

    document.querySelectorAll(".pro").forEach((card,index)=>{

        const product = products[index];

        // Open product page when clicking the card
        card.onclick = () => {
            window.location.href = `product.html?id=${product.id}`;
        };

        // Cart button
        const cartBtn = card.querySelector(".cart");

        cartBtn.onclick = (e) => {

            e.stopPropagation();

            // Prevent opening product if out of stock
            if (product.stock <= 0) {
                showToast("This product is out of stock.");
                return;
            }

            window.location.href = `product.html?id=${product.id}`;

        };

    });

}


loadProducts();



closeDrawerBtn.addEventListener("click", closeDrawer);

overlay.addEventListener("click", closeDrawer);

viewCartBtn.addEventListener("click", () => {
    window.location.href = "cart.html";
});

const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");
const sortFilter = document.getElementById("sort-filter");

function applyFilters(){

    let filtered = [...allProducts];

    const keyword = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const sort = sortFilter.value;

    // Search
    filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword)
    );

    // Category
    if(category !== "All"){
        filtered = filtered.filter(product =>
            product.category === category
        );
    }

    // Sort
    switch(sort){

        case "low-high":
            filtered.sort((a,b)=>a.price - b.price);
            break;

        case "high-low":
            filtered.sort((a,b)=>b.price - a.price);
            break;

        case "name":
            filtered.sort((a,b)=>
                a.name.localeCompare(b.name)
            );
            break;

        case "newest":
        default:
            filtered.sort((a,b)=>b.id - a.id);
            break;

    }

    renderProducts(filtered);

}

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
sortFilter.addEventListener("change", applyFilters);
