let allProducts = [];
let currentCategory = "all";
let currentSearch = "";
let currentSort = "newest";

function applyFilters(){

    let products = [...allProducts];

    // Search
    if (currentSearch){

        products = products.filter(product =>

            product.name.toLowerCase().includes(currentSearch) ||

            product.brand.toLowerCase().includes(currentSearch) ||

            (product.category || "").toLowerCase().includes(currentSearch)

        );

    }

    // Category
    if (currentCategory !== "all"){

        products = products.filter(product =>

            (product.category || "").toLowerCase() === currentCategory.toLowerCase()

        );

    }

    // Sorting
    if (currentSort === "low-high"){

        products.sort((a,b) => Number(a.price) - Number(b.price));

    }else if (currentSort === "high-low"){

        products.sort((a,b) => Number(b.price) - Number(a.price));

    }else{

        products.sort((a,b) => b.id - a.id);

    }

    renderProducts(products);

}

function renderProducts(products){

    const container = document.querySelector("#product1 .pro-container");

    if (!container) return;

    container.innerHTML = products.map(product => `

        <div class="pro">

            <img src="${product.image}" alt="${product.name}">

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

            </div>

            <a href="product.html?id=${product.id}">
                <i class="fas fa-shopping-cart cart"></i>
            </a>

        </div>

    `).join("");

}

async function loadFeaturedProducts(){

    try{

        const response = await fetch(`${API_BASE_URL}/api/products`);

        allProducts = await response.json();

        applyFilters();

    }catch(error){

        console.error("Failed to load products:", error);

    }

}

document.addEventListener("DOMContentLoaded", () => {

    loadFeaturedProducts();

    // Search
    const search = document.getElementById("home-search");

    if (search){

        search.addEventListener("input", () => {
            currentSearch = search.value.toLowerCase().trim();
            applyFilters();
        });

    }

    // Category filters
    document.querySelectorAll(".filter-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            document.querySelectorAll(".filter-btn").forEach(b =>
                b.classList.remove("active")
            );

            btn.classList.add("active");

            currentCategory = btn.dataset.category;

            applyFilters();

        });

    });

    // Sorting
    const sort = document.getElementById("sort-products");

    if (sort){

        sort.addEventListener("change", () => {

            currentSort = sort.value;

            applyFilters();

        });

    }

});