const cartItems = document.getElementById("cart-items");
const subtotalBox = document.querySelector("#subtotal table");
const badge = document.getElementById("cart-count");
const emptyCartUI = document.getElementById("empty-cart-image");
const emptyCartHeading = document.getElementById("empty-cart-heading");
const emptyCartSubtext = document.getElementById("empty-cart-subtext");
const emptyCartLink = document.getElementById("empty-cart-link");
const cartTable = document.getElementById("cart-table");
const cartLoading = document.getElementById("cart-loading");
const checkoutBtn = document.getElementById("checkout-btn");
const toastStack = document.getElementById("toast-stack");

// Tracks whatever the last successful load returned, so validateCheckout()
// doesn't need to re-fetch just to know if the cart is empty.
let lastCartItems = [];

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser"));
    } catch (e) {
        return null;
    }
}

document.addEventListener("DOMContentLoaded", loadCart);

function loadCart() {
    const user = getCurrentUser();

    if (!user) {
        showGuestState();
        return;
    }

    setLoading(true);

    fetch(`http://localhost:3000/api/cart/${user.id}`)
        .then(res => {
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            return res.json();
        })
        .then(data => {
            lastCartItems = data.items || [];
            renderCart(lastCartItems);
            updateTotals(data.total);
            updateBadge(lastCartItems);
            toggleEmptyCart(lastCartItems);
        })
        .catch(err => {
            console.error("Failed to load cart:", err);
            showMessage("Couldn't load your cart. Please try again.", "error");
            // Fall back to an empty-looking cart rather than leaving stale/broken UI
            renderCart([]);
            toggleEmptyCart([]);
        })
        .finally(() => setLoading(false));
}

function setLoading(isLoading) {
    if (!cartLoading || !cartTable) return;
    cartLoading.classList.toggle("show", isLoading);
    cartTable.style.display = isLoading ? "none" : "";
}

function renderCart(items) {

    if (!items || items.length === 0) {
        cartItems.innerHTML = "";
        return;
    }

    const rows = items.map(item => {

        const total = item.price * item.quantity;

        return `
        <tr data-item-id="${item.id}">
            <td>
                <button class="remove-btn" onclick="removeItem(${item.id}, this)" aria-label="Remove item">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>

            <td>
                <img
                    src="${item.image || 'images/default.png'}"
                    width="60"
                    alt="${item.product_name}"
                    onerror="this.src='images/default.png'"
                >
            </td>

            <td>${item.product_name}</td>

            <td>${item.size || '-'}</td>

            <td>₱${Number(item.price).toLocaleString()}</td>

            <td>
                <div class="qty-box">
                    <button onclick="updateQty(${item.id}, ${item.quantity - 1}, this)" aria-label="Decrease quantity">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQty(${item.id}, ${item.quantity + 1}, this)" aria-label="Increase quantity">+</button>
                </div>
            </td>

            <td>₱${total.toLocaleString()}</td>
        </tr>
        `;

    }).join("");

    cartItems.innerHTML = rows;
}

// Disables every button in a row while its own request is in flight,
// so a rapid double-click can't fire overlapping update/remove calls.
function setRowBusy(triggerBtn, isBusy) {

    const row = triggerBtn && triggerBtn.closest ? triggerBtn.closest("tr") : null;
    if (!row) return;

    row.classList.toggle("row-busy", isBusy);
    row.querySelectorAll("button").forEach(btn => {
        btn.disabled = isBusy;
    });

}

function updateQty(id, qty, triggerBtn) {

    if (qty <= 0) return removeItem(id, triggerBtn);

    setRowBusy(triggerBtn, true);

    fetch(`http://localhost:3000/api/cart/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty })
    })
        .then(res => {
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            loadCart();
        })
        .catch(err => {
            console.error("Failed to update quantity:", err);
            showMessage("Couldn't update quantity. Please try again.", "error");
            setRowBusy(triggerBtn, false);
        });
}

function removeItem(id, triggerBtn) {

    setRowBusy(triggerBtn, true);

    fetch(`http://localhost:3000/api/cart/remove/${id}`, {
        method: "DELETE"
    })
        .then(res => {
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            showMessage("Item removed from cart.");
            loadCart();
        })
        .catch(err => {
            console.error("Failed to remove item:", err);
            showMessage("Couldn't remove item. Please try again.", "error");
            setRowBusy(triggerBtn, false);
        });
}

function updateTotals(total) {

    if (!subtotalBox) return;

    const formatted = Number(total || 0).toLocaleString();

    subtotalBox.innerHTML = `
        <tr>
            <td>Cart Subtotal</td>
            <td>₱${formatted}</td>
        </tr>
        <tr>
            <td>Shipping</td>
            <td>Free</td>
        </tr>
        <tr>
            <td><strong>Total</strong></td>
            <td><strong>₱${formatted}</strong></td>
        </tr>
    `;
}

function updateBadge(items) {

    if (!badge) return;

    const count = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
}

function toggleEmptyCart(items) {

    if (!emptyCartUI) return;

    const isEmpty = !items || items.length === 0;

    emptyCartUI.classList.toggle("show", isEmpty);

    if (isEmpty) {
        cartItems.innerHTML = "";
        emptyCartHeading.textContent = "Your cart is empty";
        emptyCartSubtext.textContent = "Looks like you haven't added anything yet.";
        emptyCartLink.textContent = "Continue Shopping";
        emptyCartLink.href = "shop.html";
    }

    setCheckoutEnabled(!isEmpty);
}

// Guest (not logged in): different message from "logged in but empty",
// and the cart request is skipped entirely rather than silently failing.
function showGuestState() {
    setLoading(false);

    cartItems.innerHTML = "";
    updateTotals(0);
    updateBadge([]);

    if (emptyCartUI) {
        emptyCartUI.classList.add("show");
        emptyCartHeading.textContent = "Log in to view your cart";
        emptyCartSubtext.textContent = "Your saved items will appear here once you're signed in.";
        emptyCartLink.textContent = "Log In";
        emptyCartLink.href = "login.html";
    }

    setCheckoutEnabled(false);
}

function setCheckoutEnabled(enabled) {
    if (!checkoutBtn) return;
    checkoutBtn.disabled = !enabled;
}

// Was referenced by the checkout button's onclick but never defined,
// so clicking "Proceed to Secure Checkout" threw a ReferenceError and did nothing.
function validateCheckout() {
    const user = getCurrentUser();

    if (!user) {
        showMessage("Please log in to checkout.", "error");
        return;
    }

    if (!lastCartItems || lastCartItems.length === 0) {
        showMessage("Your cart is empty.", "error");
        return;
    }

    window.location.href = "checkout.html";
}

function applyCoupon() {
    const input = document.getElementById("coupon-input");
    const code = input ? input.value.trim() : "";

    if (!code) {
        showMessage("Enter a coupon code first.", "error");
        return;
    }

    // No coupon endpoint exists yet — placeholder feedback so the button
    // isn't dead UI. Wire this up to a real API when one's available.
    showMessage(`Coupon "${code}" isn't valid right now.`, "error");
}

// Same stacked-toast pattern used on wishlist.html / checkout.html,
// so cart feedback looks and behaves consistently across the site.
function showMessage(text, type = "success") {
    if (!toastStack) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = text;
    toastStack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("is-leaving");
        toast.addEventListener("animationend", () => toast.remove());
    }, 2500);
}