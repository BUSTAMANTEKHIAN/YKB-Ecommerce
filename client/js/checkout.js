const API_BASE = `${API_BASE_URL}/api`;

const user = JSON.parse(localStorage.getItem("currentUser"));

// UI elements
const orderItemsEl = document.getElementById("order-items");
const itemCountEl = document.getElementById("item-count");
const subtotalEl = document.getElementById("subtotal-price");
const totalEl = document.getElementById("total-price");
const form = document.getElementById("checkout-form");
const placeOrderBtn = document.getElementById("place-order-btn");

let cartData = [];
let cartTotal = 0;

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

    showToast("Please log in to check out.", "error");

    setTimeout(() => {
        window.location.href = "login.html";
    }, 900);

} else {

    document.addEventListener("DOMContentLoaded", loadCheckoutCart);
    form.addEventListener("submit", handleCheckoutSubmit);

}

// =========================
// LOAD CART FROM MYSQL
// =========================
async function loadCheckoutCart() {

    renderSkeleton();

    try {

        const response = await fetch(`${API_BASE}/cart/${user.id}`);

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        cartData = data.items || [];
        cartTotal = Number(data.total) || 0;

        renderOrderSummary();

    } catch (err) {

        console.error("Checkout cart error:", err);
        renderCartError();

    }

}

// =========================
// LOADING STATE
// =========================
function renderSkeleton() {

    itemCountEl.textContent = "Loading…";

    orderItemsEl.innerHTML = `
        <div class="order-item">
            <div class="order-item__img"></div>
            <div class="order-item__info"><h4>Loading order…</h4></div>
        </div>
    `;

}

// =========================
// ERROR STATE
// =========================
function renderCartError() {

    itemCountEl.textContent = "—";

    orderItemsEl.innerHTML = `
        <div class="ticket__empty">
            We couldn't load your cart. Please refresh the page.
        </div>
    `;

    subtotalEl.textContent = "₱0";
    totalEl.textContent = "₱0";

    placeOrderBtn.disabled = true;

}

// =========================
// RENDER ORDER SUMMARY
// =========================
function renderOrderSummary() {

    itemCountEl.textContent =
        `${cartData.length} item${cartData.length !== 1 ? "s" : ""}`;

    if (!cartData.length) {

        orderItemsEl.innerHTML = `
            <div class="ticket__empty">
                Your cart is empty.
                <br>
                <a href="cart.html">Go back to your cart</a>
            </div>
        `;

        subtotalEl.textContent = "₱0";
        totalEl.textContent = "₱0";
        placeOrderBtn.disabled = true;

        return;

    }

    orderItemsEl.innerHTML = cartData.map(item => {

        const subtotal = item.price * item.quantity;

        return `
            <div class="order-item">
                <div class="order-item__img">
                    <img
                        src="${item.image || "images/placeholder.jpg"}"
                        alt="${item.product_name}"
                        onerror="this.src='images/placeholder.jpg'"
                    >
                </div>
                <div class="order-item__info">
                    <h4>${item.product_name}</h4>
                    <span>Qty ${item.quantity}${item.size ? ` · ${item.size}` : ""}</span>
                </div>
                <div class="order-item__price">₱${subtotal.toLocaleString()}</div>
            </div>
        `;

    }).join("");

    subtotalEl.textContent = `₱${cartTotal.toLocaleString()}`;
    totalEl.textContent = `₱${cartTotal.toLocaleString()}`;
    placeOrderBtn.disabled = false;

}

// =========================
// VALIDATION
// =========================
function validateForm() {

    let firstInvalid = null;
    let isValid = true;

    const fields = form.querySelectorAll("input[required]");

    fields.forEach(input => {

        const errorEl = form.querySelector(`[data-error-for="${input.id}"]`);
        input.classList.remove("has-error");
        if (errorEl) errorEl.textContent = "";

        if (!input.checkValidity()) {

            isValid = false;
            input.classList.add("has-error");

            if (errorEl) {
                errorEl.textContent = input.validity.valueMissing
                    ? "This field is required."
                    : "Please enter a valid value.";
            }

            if (!firstInvalid) firstInvalid = input;

        }

    });

    if (firstInvalid) firstInvalid.focus();

    return isValid;

}

// =========================
// CHECKOUT SUBMIT
// =========================
async function handleCheckoutSubmit(e) {

    e.preventDefault();

    if (!cartData.length) {
        showToast("Your cart is empty.", "error");
        return;
    }

    if (!validateForm()) {
        showToast("Please fill in the required fields.", "error");
        return;
    }

    const payment = form.querySelector('input[name="payment"]:checked');

    if (!payment) {
        showToast("Please select a payment method.", "error");
        return;
    }

    const shippingInfo = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        address: form.address.value.trim(),
        city: form.city.value.trim(),
        postalCode: form.postalCode.value.trim()
    };

    setSubmitting(true);

    try {

        const response = await fetch(`${API_BASE}/orders/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                payment_method: payment.value,
                shipping_info: shippingInfo,
                items: cartData,
                total: cartTotal
            })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.success === false) {
            throw new Error(data.message || "Checkout failed");
        }

        // Order-success.html reads this key to render the confirmation —
        // it has no API call of its own, so the data has to be handed off here.
        localStorage.setItem("lastOrder", JSON.stringify({
            orderId: data.order_id,
            items: cartData,
            total: cartTotal,
            shippingInfo: shippingInfo,
            paymentMethod: payment.value,
            placedAt: new Date().toISOString()
        }));

        showToast("Order placed successfully!", "success");

        setTimeout(() => {
            window.location.href = "order-success.html";
        }, 700);

    } catch (err) {

        console.error(err);
        showToast("Checkout failed. Please try again.", "error");
        setSubmitting(false);

    }

}

function setSubmitting(isSubmitting) {

    placeOrderBtn.disabled = isSubmitting;
    placeOrderBtn.classList.toggle("is-loading", isSubmitting);

}