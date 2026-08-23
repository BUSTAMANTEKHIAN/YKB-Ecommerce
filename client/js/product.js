const addCartBtn = document.getElementById("add-cart");
const buyNowBtn = document.getElementById("buy-now");
const wishlistBtn = document.getElementById("wishlist-btn");

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let currentProduct = null;


// ==========================================
// IMAGE URL
// ==========================================

function getProductImage(image) {
    if (!image) {
        return `${API_BASE_URL}/images/products/no-image.png`;
    }

    // Already a complete URL
    if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
    }

    // Remove leading slashes
    image = image.replace(/^\/+/, "");

    // Database stores: images/products/file.jpg
    return `${API_BASE_URL}/${image}`;
}


// ==========================================
// VALIDATE SIZE
// ==========================================

function validateSize() {

    const size = document.getElementById("size").value;

    if (!size) {
        alert("Please choose your size first.");
        return false;
    }

    return true;
}


// ==========================================
// SAVE PRODUCT TO CART
// ==========================================

async function saveProductToCart() {

    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user) {
        alert("Please login first.");
        window.location.href = "login.html";
        return false;
    }

    const product = {

        product_id: document.getElementById("product-id").value,

        product_name:
            document.getElementById("product-name").innerText,

        price:
            Number(
                document.getElementById("product-price").dataset.price
            ),

        image:
            document.getElementById("MainImg").src,

        size:
            document.getElementById("size").value,

        quantity:
            Number(
                document.getElementById("quantity").value
            ),

        user_id: user.id
    };


    try {

        const response = await fetch(
            `${API_BASE_URL}/api/cart/add`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(product)
            }
        );

        const data = await response.json();

        return data.success;

    } catch (error) {

        console.error("Cart error:", error);

        alert("Failed to add product to cart.");

        return false;
    }
}


// ==========================================
// ADD TO CART
// ==========================================

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


// ==========================================
// BUY NOW
// ==========================================

buyNowBtn.addEventListener("click", async () => {

    if (!validateSize()) return;

    const success = await saveProductToCart();

    if (success) {

        window.location.href = "cart.html";

    }

});


// ==========================================
// WISHLIST
// ==========================================

wishlistBtn.addEventListener("click", async () => {

    const user = JSON.parse(localStorage.getItem("currentUser"));

    if (!user) {

        alert("Please login first.");

        window.location.href = "login.html";

        return;
    }


    const productId =
        document.getElementById("product-id").value;


    try {

        const response = await fetch(
            `${API_BASE_URL}/api/wishlist/add`,
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

            wishlistBtn.innerHTML =
                '<i class="fas fa-heart"></i>';

            alert("Added to wishlist!");

        }

    } catch (error) {

        console.error("Wishlist error:", error);

        alert("Failed to add to wishlist.");

    }

});


// ==========================================
// UPDATE WISHLIST BUTTON
// ==========================================

function updateWishlistButton() {

    const user =
        JSON.parse(localStorage.getItem("currentUser"));

    const wishlistKey = user
        ? `wishlist_${user.email}`
        : "wishlist_guest";


    const wishlist =
        JSON.parse(
            localStorage.getItem(wishlistKey)
        ) || [];


    const productId =
        document.getElementById("product-id").value;


    const exists =
        wishlist.find(
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


// ==========================================
// LOAD PRODUCT
// ==========================================

async function loadProduct() {

    if (!productId) {

        console.error("No product ID found.");

        return;

    }


    try {

        console.log(
            "Fetching product:",
            `${API_BASE_URL}/api/products/${productId}`
        );


        const response = await fetch(
            `${API_BASE_URL}/api/products/${productId}`
        );


        console.log(
            "Product API status:",
            response.status
        );


        if (!response.ok) {

            console.error(
                "Product API failed:",
                response.status
            );

            document.querySelector("#prodetails").innerHTML = `
                <div style="text-align:center;width:100%;padding:50px;">

                    <h2>Product Not Found</h2>

                    <p>
                        The product you are looking for doesn't exist.
                    </p>

                    <br>

                    <a href="shop.html" class="normal">
                        Back to Shop
                    </a>

                </div>
            `;

            return;

        }


        // IMPORTANT:
        // Convert API response into the product object

        const product = await response.json();

        currentProduct = product;


        console.log(
            "Product received:",
            product
        );


        // ==========================================
        // PRODUCT IMAGE
        // ==========================================

        const imageUrl = getProductImage(product.image);

console.log("DATABASE IMAGE:", product.image);
console.log("API BASE URL:", API_BASE_URL);
console.log("FINAL IMAGE URL:", imageUrl);

const mainImg = document.getElementById("MainImg");

mainImg.src = imageUrl;

mainImg.onerror = function () {
    console.error("IMAGE FAILED:", imageUrl);
};

mainImg.onload = function () {
    console.log("IMAGE LOADED:", imageUrl);
};


        // ==========================================
        // THUMBNAIL
        // ==========================================

        const thumbnailGroup =
            document.getElementById("thumbnail-group");


        thumbnailGroup.innerHTML = `
            <div class="small-img-col">

                <img
                    src="${imageUrl}"
                    width="100%"
                    class="small-img"
                    alt="${product.name}"
                >

            </div>
        `;


        const thumbnail =
            thumbnailGroup.querySelector(".small-img");


        if (thumbnail) {

            thumbnail.onclick = function () {

                mainImg.src = thumbnail.src;

            };

        }


        // ==========================================
        // PRODUCT INFORMATION
        // ==========================================

        document.getElementById("product-id").value =
            product.id;


        document.getElementById("product-name").textContent =
            product.name;


        document.getElementById("product-price").textContent =
            "₱" +
            Number(product.price).toLocaleString();


        document.getElementById("product-price")
            .dataset.price = product.price;


        document.getElementById("product-category")
            .textContent =
            "Home / " + product.category;


        document.getElementById("product-description")
            .textContent =
            product.description;


        document.getElementById("product-stock")
            .textContent =
            product.stock > 0
                ? `In Stock (${product.stock})`
                : "Out of Stock";


        // ==========================================
        // STOCK
        // ==========================================

        if (product.stock <= 0) {

            addCartBtn.disabled = true;

            buyNowBtn.disabled = true;

            addCartBtn.textContent =
                "Out of Stock";

            buyNowBtn.style.display =
                "none";

        }


        // ==========================================
        // QUANTITY
        // ==========================================

        const qty =
            document.getElementById("quantity");


        if (product.stock > 0) {

            qty.max = product.stock;

            qty.min = 1;

        } else {

            qty.value = 0;

            qty.disabled = true;

        }


        qty.addEventListener("input", () => {

            let value =
                Number(qty.value);


            if (value > product.stock) {

                qty.value =
                    product.stock;

            }


            if (value < 1) {

                qty.value = 1;

            }

        });


        updateWishlistButton();


        // Load related products
        loadRelatedProducts();

    }


    catch (error) {

        console.error(
            "Failed to load product:",
            error
        );

    }

}


// ==========================================
// RELATED PRODUCTS
// ==========================================

async function loadRelatedProducts() {

    if (!currentProduct) return;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/products`
            );


        const products =
            await response.json();


        const container =
            document.getElementById(
                "related-products"
            );


        container.innerHTML = "";


        let related =
            products.filter(product =>
                product.category === currentProduct.category &&
                product.id != currentProduct.id
            );


        if (related.length < 4) {

            const extra =
                products.filter(product =>
                    product.category !== currentProduct.category &&
                    product.id != currentProduct.id
                );


            related =
                [
                    ...related,
                    ...extra
                ].slice(0, 4);

        } else {

            related =
                related.slice(0, 4);

        }


        related.forEach(product => {

            container.innerHTML += `

                <div
                    class="pro"
                    onclick="
                        window.location.href='product.html?id=${product.id}'
                    "
                >

                    <img
                        src="${getProductImage(product.image)}"
                        alt="${product.name}"
                    >

                    <div class="des">

                        <span>${product.brand}</span>

                        <h5>${product.name}</h5>

                        <h4>
                            ₱${Number(product.price).toLocaleString()}
                        </h4>

                    </div>

                </div>

            `;

        });

    }

    catch (error) {

        console.error(
            "Related products error:",
            error
        );

    }

}


// ==========================================
// LOAD REVIEWS
// ==========================================

async function loadReviews() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/reviews/${productId}`
            );


        const data =
            await response.json();


        document.getElementById("avg-rating")
            .textContent =
            Number(data.average).toFixed(1);


        document.getElementById("review-count")
            .textContent =
            data.total;


        const list =
            document.getElementById("review-list");


        if (data.reviews.length === 0) {

            list.innerHTML =
                "<p>No reviews yet.</p>";

            return;

        }


        list.innerHTML = "";


        data.reviews.forEach(review => {

            list.innerHTML += `

                <div class="review-card">

                    <h4>
                        ${review.fullname}
                    </h4>

                    <div class="review-stars">

                        ${
                            "★".repeat(review.rating)
                        }

                        ${
                            "☆".repeat(
                                5 - review.rating
                            )
                        }

                    </div>

                    <p>
                        ${review.review}
                    </p>

                    <div class="review-date">

                        ${
                            new Date(
                                review.created_at
                            ).toLocaleDateString()
                        }

                    </div>

                </div>

            `;

        });

    }

    catch (error) {

        console.error(
            "Reviews error:",
            error
        );

    }

}


// ==========================================
// SUBMIT REVIEW
// ==========================================

document
    .getElementById("review-form")
    .addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const user =
                JSON.parse(
                    localStorage.getItem(
                        "currentUser"
                    )
                );


            if (!user) {

                alert(
                    "Please login first."
                );

                return;

            }


            const rating =
                document.getElementById(
                    "review-rating"
                ).value;


            const review =
                document.getElementById(
                    "review-text"
                ).value;


            try {

                const response =
                    await fetch(
                        `${API_BASE_URL}/api/reviews/add`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                product_id:
                                    productId,

                                user_id:
                                    user.id,

                                rating,

                                review

                            })
                        }
                    );


                const data =
                    await response.json();


                if (data.success) {

                    document
                        .getElementById(
                            "review-form"
                        )
                        .reset();


                    loadReviews();


                    alert(
                        "Review submitted successfully!"
                    );

                }

            }

            catch (error) {

                console.error(
                    "Submit review error:",
                    error
                );

            }

        }
    );


// ==========================================
// START
// ==========================================

loadProduct();
loadReviews();