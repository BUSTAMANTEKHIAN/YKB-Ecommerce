const API_BASE = `${API_BASE_URL}/api`;

const user = JSON.parse(localStorage.getItem("currentUser"));
const container = document.getElementById("wishlist-items");
const totalLabel = document.getElementById("wishlist-total");

let wishlist = [];

// =========================
// TAG LOOP ICON (reused across states)
// =========================
const LOOP_SVG = `
    <svg viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2 L13 10" stroke="#C9AD7F" stroke-width="2" stroke-linecap="round"/>
        <circle cx="13" cy="14" r="4" stroke="#97742E" stroke-width="2"/>
    </svg>
`;

// =========================
// TOASTS (replaces alert())
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

// =========================
// GUARD: must be logged in
// =========================
if (!user || !user.id) {

    showToast("Please log in to view your wishlist.", "error");

    setTimeout(() => {
        window.location.href = "login.html";
    }, 900);

} else {

    document.addEventListener("DOMContentLoaded", loadWishlist);

}

// =========================
// LOAD WISHLIST FROM MYSQL
// =========================
async function loadWishlist() {

    renderSkeletons();

    try {

        const response = await fetch(`${API_BASE}/wishlist/${user.id}`);

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        wishlist = await response.json();

        renderWishlist();

    } catch (err) {

        console.error(err);
        renderError();

    }

}

// =========================
// SKELETON / LOADING STATE
// =========================
function renderSkeletons() {

    totalLabel.textContent = "Loading wishlist…";

    const cards = Array.from({ length: 3 })
        .map(() => `<div class="wish-skeleton"></div>`)
        .join("");

    container.innerHTML = cards;

}

// =========================
// ERROR STATE
// =========================
function renderError() {

    totalLabel.textContent = "Couldn't load wishlist";

    container.innerHTML = `
        <div class="wishlist-state is-error">
            <div class="wishlist-state__loop">${LOOP_SVG}</div>
            <h2>We couldn't load your tags</h2>
            <p>Something went wrong reaching the server. Try again in a moment.</p>
            <a href="wishlist.html" class="shop-btn">Retry</a>
        </div>
    `;

}

// =========================
// RENDER WISHLIST
// =========================
function renderWishlist() {

    totalLabel.textContent =
        `${wishlist.length} item${wishlist.length !== 1 ? "s" : ""} tagged`;

    if (wishlist.length === 0) {

        container.innerHTML = `
            <div class="wishlist-state">
                <div class="wishlist-state__loop">${LOOP_SVG}</div>
                <h2>Nothing tagged yet</h2>
                <p>Save pieces you love and they'll hang here.</p>
                <a href="shop.html" class="shop-btn">Browse the shop</a>
            </div>
        `;

        return;

    }

    const cards = wishlist.map((item, index) => `
        <div class="wish-card" data-index="${index}">

            <span class="wish-card__loop">${LOOP_SVG}</span>
            <span class="wish-card__index">No. ${String(index + 1).padStart(3, "0")}</span>

            <div class="wish-card__image">
                <img
                    src="${item.image}"
                    alt="${item.name}"
                    onerror="this.src='images/placeholder.jpg'"
                >
            </div>

            <div class="wish-card__perf"></div>

            <div class="wish-card__body">
                <h3 class="wish-card__name">${item.name}</h3>
                <p class="wish-card__price">₱${Number(item.price).toLocaleString()}</p>

                <div class="wish-buttons">
                    <button class="move-cart" onclick="moveToCart(${index})">
                        <i class="fa-solid fa-bag-shopping"></i> Move to cart
                    </button>
                    <button class="remove-wish" onclick="removeWishlist(${index})">
                        <i class="fa-solid fa-xmark"></i> Remove
                    </button>
                </div>
            </div>

        </div>
    `).join("");

    container.innerHTML = cards;

}

// =========================
// HELPERS
// =========================
function setCardButtonsDisabled(index, disabled) {

    const card = container.querySelector(`.wish-card[data-index="${index}"]`);
    if (!card) return;

    card.querySelectorAll("button").forEach(btn => {
        btn.disabled = disabled;
    });

}

// =========================
// MOVE TO CART
// =========================
async function moveToCart(index) {

    const item = wishlist[index];
    if (!item) return;

    setCardButtonsDisabled(index, true);

    try {

        const response = await fetch(`${API_BASE}/cart/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                product_id: item.product_id,
                product_name: item.name,
                price: item.price,
                image: item.image,
                size: "M",
                quantity: 1,
                user_id: user.id
            })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {

            await removeWishlist(index, { silent: true });
            showToast("Moved to your cart.", "success");

        } else {

            showToast(data.message || "Couldn't move that item to your cart.", "error");
            setCardButtonsDisabled(index, false);

        }

    } catch (err) {

        console.error(err);
        showToast("Couldn't move that item to your cart.", "error");
        setCardButtonsDisabled(index, false);

    }

}

// =========================
// REMOVE FROM WISHLIST
// =========================
async function removeWishlist(index, { silent = false } = {}) {

    const item = wishlist[index];
    if (!item) return;

    setCardButtonsDisabled(index, true);

    try {

        const response = await fetch(`${API_BASE}/wishlist/remove/${item.id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {

            const card = container.querySelector(`.wish-card[data-index="${index}"]`);

            if (card) {
                card.classList.add("is-removing");
                await new Promise(resolve => setTimeout(resolve, 280));
            }

            wishlist.splice(index, 1);
            renderWishlist();

            if (!silent) showToast("Removed from your wishlist.", "default");

        } else {

            showToast(data.message || "Couldn't remove that item.", "error");
            setCardButtonsDisabled(index, false);

        }

    } catch (err) {

        console.error(err);
        showToast("Couldn't remove that item.", "error");
        setCardButtonsDisabled(index, false);

    }

}