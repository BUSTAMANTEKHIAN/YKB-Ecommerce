const form = document.getElementById("productForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const product = {

        name: document.getElementById("name").value,
        brand: document.getElementById("brand").value,
        category: document.getElementById("category").value,
        description: document.getElementById("description").value,
        price: document.getElementById("price").value,
        stock: document.getElementById("stock").value,
        image: document.getElementById("image").value

    };

    const response = await fetch("http://localhost:3000/api/products", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(product)

    });

    const data = await response.json();

    alert(data.message);

    form.reset();

});