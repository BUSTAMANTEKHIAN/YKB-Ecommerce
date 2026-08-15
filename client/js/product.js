const addCartBtn = document.getElementById("add-cart");
const buyNowBtn = document.getElementById("buy-now");
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

function validateSize() {
    const size = document.getElementById("size").value;

    if (!size) {
        alert("Please choose your size first.");
        return false;
    }

    return true;
}   

async function saveProductToCart() {

    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user) {
        alert("Please login first.");
        window.location.href = "login.html";
        return false;
    }

    const product = {
        product_id: document.getElementById("product-id").value,
        product_name: document.getElementById("product-name").innerText,
        price: Number(document.getElementById("product-price").dataset.price),
        image: document.getElementById("MainImg").src,
        size: document.getElementById("size").value,
        quantity: Number(document.getElementById("quantity").value),
        user_id: user.id
    };

    const response = await fetch("http://localhost:3000/api/cart/add", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
    });

    const data = await response.json();

    return data.success;
}

// ADD TO CART
addCartBtn.addEventListener("click", async () => {

    if (!validateSize()) return;

    const success = await saveProductToCart();

    if (success) {
        alert("Added to cart successfully!");

        if (typeof updateCartCount === "function") {
            updateCartCount();
        }
    }

});

// BUY NOW
buyNowBtn.addEventListener("click", async () => {

    if (!validateSize()) return;

    const success = await saveProductToCart();

    if (success) {
        window.location.href = "cart.html";
    }

});

const wishlistBtn =
    document.getElementById("wishlist-btn");

wishlistBtn.addEventListener("click", async () => {

    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    const productId = document.getElementById("product-id").value;

    try {

        const response = await fetch(
            "http://localhost:3000/api/wishlist/add",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: user.id,
                    product_id: productId
                })
            }
        );

        const data = await response.json();

        if (data.success) {

            wishlistBtn.classList.add("active");
            wishlistBtn.innerHTML = '<i class="fas fa-heart"></i>';

            alert("Added to wishlist!");

        }

    } catch (err) {

        console.error(err);
        alert("Failed to add to wishlist.");

    }

});

function updateWishlistButton() {
    let user = JSON.parse(localStorage.getItem("currentUser"));

    let wishlistKey = user
        ? `wishlist_${user.email}`
        : "wishlist_guest";

    let wishlist =
        JSON.parse(localStorage.getItem(wishlistKey)) || [];

    const productId =
        document.getElementById("product-id").value;

    const exists = wishlist.find(
        item => item.id == productId
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

async function loadProduct() {

    try {

        const response = await fetch(`/api/products/${productId}`);

        if (!response.ok) {

            document.querySelector("#prodetails").innerHTML = `
                <div style="text-align:center;width:100%;padding:50px;">
                    <h2>Product Not Found</h2>
                    <p>The product you are looking for doesn't exist.</p>
                    <br>
                    <a href="shop.html" class="normal">
                        Back to Shop
                    </a>
                </div>
            `;

            return;

        }

        const product = await response.json();

        window.currentProduct = product;

        await loadRelatedProducts();

        document.getElementById("product-id").value = product.id;

        document.getElementById("MainImg").src = product.image;

        const thumbs = document.querySelectorAll(".small-img");

        thumbs.forEach(img => {
            img.src = product.image;
        
            img.onclick = () => {
                document.getElementById("MainImg").src = img.src;
            };
        });

        document.getElementById("product-name").textContent = product.name;

        document.getElementById("product-price").textContent =
            "₱" + Number(product.price).toLocaleString();

        document.getElementById("product-price")
            .dataset.price = product.price;

        document.getElementById("product-category").textContent =
            "Home / " + product.category;

        document.getElementById("product-description").textContent =
            product.description;

        document.getElementById("product-stock").textContent =
            product.stock > 0
                ? `In Stock (${product.stock})`
                : "Out of Stock";

        if(product.stock <= 0){
                
            addCartBtn.disabled = true;
                
            buyNowBtn.disabled = true;
                
            addCartBtn.textContent = "Out of Stock";
                
            buyNowBtn.style.display = "none";
                
        }

        const qty = document.getElementById("quantity");

            if (product.stock > 0) {

                qty.max = product.stock;
                qty.min = 1;

            } else {
            
                qty.value = 0;
                qty.disabled = true;
            
            }

        qty.addEventListener("input", () => {

            if(Number(qty.value) > product.stock){
            
                qty.value = product.stock;
            
            }
        
            if(Number(qty.value) < 1){
            
                qty.value = 1;
            
            }
        
        });

        document.getElementById("product-stock").textContent =
            product.stock > 0
                ? `In Stock (${product.stock})`
                : "Out of Stock";

        updateWishlistButton();

            }

    

    catch(err){

        console.error(err);

    }

}

loadProduct();


async function loadRelatedProducts() {

    try {

        const response = await fetch("/api/products");
        const products = await response.json();

        const container = document.getElementById("related-products");
        container.innerHTML = "";

        // First: same category
        let related = products.filter(p =>
            p.category === currentProduct.category &&
            p.id != currentProduct.id
        );

        // If less than 4, fill with other products
        if (related.length < 4) {

            const extra = products.filter(p =>
                p.category !== currentProduct.category &&
                p.id != currentProduct.id
            );

            related = [...related, ...extra].slice(0, 4);

        } else {

            related = related.slice(0, 4);

        }

        related.forEach(product => {

            container.innerHTML += `
                <div class="pro"
                     onclick="window.location.href='product.html?id=${product.id}'">

                    <img src="${product.image}" alt="${product.name}">

                    <div class="des">

                        <span>${product.brand}</span>

                        <h5>${product.name}</h5>

                        <h4>₱${Number(product.price).toLocaleString()}</h4>

                    </div>

                </div>
            `;

        });

    } catch (err) {

        console.log(err);

    }

}

// =========================
// LOAD REVIEWS
// =========================
async function loadReviews() {

    try {

        const response = await fetch(
            `http://localhost:3000/api/reviews/${productId}`
        );

        const data = await response.json();

        document.getElementById("avg-rating").textContent =
            Number(data.average).toFixed(1);

        document.getElementById("review-count").textContent =
            data.total;

        const list = document.getElementById("review-list");

        if (data.reviews.length === 0) {

            list.innerHTML = "<p>No reviews yet.</p>";

            return;

        }

        list.innerHTML = "";

        data.reviews.forEach(r => {

            list.innerHTML += `
                <div class="review-card">
                    <h4>${r.fullname}</h4>
                    <div class="review-stars">
                        ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}
                    </div>
                    <p>${r.review}</p>
                    <div class="review-date">
                        ${new Date(r.created_at).toLocaleDateString()}
                    </div>
                </div>
            `;

        });

    } catch (err) {

        console.error(err);

    }

}

// =========================
// SUBMIT REVIEW
// =========================
document.getElementById("review-form").addEventListener("submit", async (e) => {

    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user) {
        alert("Please login first.");
        return;
    }

    const rating = document.getElementById("review-rating").value;
    const review = document.getElementById("review-text").value;

    const response = await fetch(
        "http://localhost:3000/api/reviews/add",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                product_id: productId,
                user_id: user.id,
                rating,
                review
            })
        }
    );

    const data = await response.json();

    if (data.success) {

        document.getElementById("review-form").reset();

        loadReviews();

        alert("Review submitted successfully!");

    }

});

// Load reviews when page opens
window.addEventListener("DOMContentLoaded", loadReviews);