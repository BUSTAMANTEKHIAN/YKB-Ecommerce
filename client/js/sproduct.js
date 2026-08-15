const addCartBtn = document.getElementById("add-cart");
const buyNowBtn = document.getElementById("buy-now");


function validateSize() {
    const size = document.getElementById("size").value;

    if (!size) {
        alert("Please choose your size first.");
        return false;
    }

    return true;
}

function saveProductToCart() {
    let user = JSON.parse(localStorage.getItem("currentUser"));
    let cartKey = user ? `cart_${user.email}` : "cart_guest";

    const product = {
        name: document.getElementById("product-name").innerText,
        price: document.getElementById("product-price").innerText,
        image: document.getElementById("MainImg").src,
        size: document.getElementById("size").value,
        quantity: Number(document.getElementById("quantity").value)
    };

    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

    const existingProduct = cart.find(
        item =>
            item.name === product.name &&
            item.size === product.size
    );

    if (existingProduct) {
        existingProduct.quantity += product.quantity;
    } else {
        cart.push(product);
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));

    return cart;
}

// ADD TO CART
addCartBtn.addEventListener("click", () => {
    if (!validateSize()) return;

    saveProductToCart();

    alert("Added to your cart successfully!");

    if (typeof updateCartCount === "function") {
        updateCartCount();
    }
});

// BUY NOW
buyNowBtn.addEventListener("click", () => {
    if (!validateSize()) return;

    saveProductToCart();

    window.location.href = "cart.html";
});

const wishlistBtn =
    document.getElementById("wishlist-btn");

wishlistBtn.addEventListener("click", () => {

    let user =
        JSON.parse(localStorage.getItem("currentUser"));

    let wishlistKey = user
        ? `wishlist_${user.email}`
        : "wishlist_guest";

    const product = {
        name: document.getElementById("product-name").innerText,
        price: document.getElementById("product-price").innerText,
        image: document.getElementById("MainImg").src,
        size: document.getElementById("size").value,
        quantity: Number(document.getElementById("quantity").value)
    };

    let wishlist =
        JSON.parse(localStorage.getItem(wishlistKey)) || [];

    const exists =
        wishlist.find(
            item =>
                item.name === product.name &&
                item.image === product.image
    );

    if (exists) {
        wishlist = wishlist.filter(
            item =>
                !(item.name === product.name &&
                  item.image === product.image)
        );
    
        wishlistBtn.classList.remove("active");
        wishlistBtn.classList.remove("pop");
        wishlistBtn.innerHTML =
            '<i class="far fa-heart"></i>';
    }
    else {
        wishlist.push(product);

        wishlistBtn.classList.add("active");
        wishlistBtn.classList.remove("pop"); // reset animation

        // trigger animation again
        void wishlistBtn.offsetWidth;

        wishlistBtn.classList.add("pop");
        wishlistBtn.innerHTML =
            '<i class="fas fa-heart"></i>';

        setTimeout(() => {
            wishlistBtn.classList.remove("pop");
        }, 400);
    }

    localStorage.setItem(
        wishlistKey,
        JSON.stringify(wishlist)
    );

    updateWishlistCount();
});

function updateWishlistButton() {
    let user = JSON.parse(localStorage.getItem("currentUser"));

    let wishlistKey = user
        ? `wishlist_${user.email}`
        : "wishlist_guest";

    let wishlist =
        JSON.parse(localStorage.getItem(wishlistKey)) || [];

    const productName =
        document.getElementById("product-name").innerText;

    const productImage =
        document.getElementById("MainImg").src;

    const exists = wishlist.find(
        item =>
            item.name === productName &&
            item.image === productImage
    );

    if (exists) {
        wishlistBtn.classList.add("active");
        wishlistBtn.innerHTML =
            '<i class="fas fa-heart"></i>';
    } else {
        wishlistBtn.classList.remove("active");
        wishlistBtn.innerHTML =
            '<i class="far fa-heart"></i>';
    }
}

window.addEventListener("DOMContentLoaded", updateWishlistButton);