const addCartBtn = document.getElementById("add-cart");

if (addCartBtn) {
    addCartBtn.addEventListener("click", () => {

        const user = JSON.parse(localStorage.getItem("currentUser"));

        if (!user) {
            alert("Please login first!");
            window.location.href = "login.html";
            return;
        }

        const product = {
            product_name: document.getElementById("product-name").innerText,
            price: parseFloat(document.getElementById("product-price").innerText.replace(/[^0-9.]/g, "")),
            quantity: Number(document.getElementById("quantity").value || 1)
        };

        fetch("http://localhost:3000/api/cart/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...product,
                user_id: user.id
            })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message || "Added to cart!");
        })
        .catch(err => {
            console.error(err);
            alert("Error adding to cart");
        });

    });
}