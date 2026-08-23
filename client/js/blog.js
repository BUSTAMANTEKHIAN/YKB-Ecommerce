const blogPosts = [
            {
            title: "The Cotton-Jersey Zip-up Hoodie",
            image: "images/blog/bl4.avif",
            date: "13/01",
            time: "5 min read",
            category: "Fashion",
            short: "If you're thinking of starting a clothing business...",
            full: "If you're thinking of starting a clothing business..."
        },
        {
            title: "Why Start a Fashion Blog?",
            image: "images/blog/bl3.avif",
            date: "15/01",
            time: "4 min read",
            category: "Fashion",
            short: "A blog is your creative space...",
            full: "A blog is your creative space..."
        },
        {
            title: "Building Your Brand",
            image: "images/blog/bl5.avif",
            date: "18/01",
            time: "6 min read",
            category: "Business",
            short: "Starting a blog should feel exciting...",
            full: "Starting a blog should feel exciting..."
        },
        {
            title: "About Our Company",
            image: "images/blog/bl6.avif",
            date: "20/01",
            time: "3 min read",
            category: "Company",
            short: "First impressions are everything...",
            full: "First impressions are everything..."
        },
        {
            title: "Color Combination For Outfits",
            image: "images/blog/bl7.jpg",
            date: "08/11",
            time: "5 min read",
            category: "Outfit Ideas",
            short: "Outfit Color Combinations : Best Color Combinations for Outfits ...",
            full: "Outfit Color Combinations : Best Color Combinations for Outfits ..."
        },
        {
          "title": "Old Money Style: 18 Timeless Outfit Combinations",
          "image": "images/blog/bl8.jpg",
          "date": "11/08",
          "time": "5 min read",
          "category": "Style Guide",
          "short": "Master the art of effortless elegance with neutral tones, tailored pants, and refined wardrobe essentials.",
          "full": "Master the art of effortless elegance with neutral tones, tailored pants, and refined wardrobe essentials. The 'Old Money' aesthetic focuses on quiet luxury—prioritizing high-quality fabrics, clean lines, and versatile neutrals over loud logos. In this guide, we break down 18 complete outfit formulas using staple pieces like classic knitwear, tailored trousers, sleek loafers, and minimal accessories so you can elevate your everyday wardrobe with ease."
        },
        {
          "title": "Color Combinations: Styling Warm Tones & Earthy Neutrals",
          "image": "images/blog/bl10.jpg",
          "date": "10/08",
          "time": "3 min read",
          "category": "Outfit Ideas",
          "short": "Learn how to layer cream, rich brown, and muted gray denim for a cozy, cohesive look.",
          "full": "Learn how to layer cream, rich brown, and muted gray denim for a cozy, cohesive look. Pairing neutrals doesn't have to be boring—the key is playing with texture and subtle color warmth. By combining a soft cream cable-knit cardigan with a fitted chocolate brown tee, wide-leg washed denim, and matching tonal accessories, you create a balanced, effortlessly stylish ensemble perfect for casual days."
        },
        {
          "title": "Men's Everyday Style: Simple Layering & Color Palettes",
          "image": "images/blog/bl9.jpg",
          "date": "08/08",
          "time": "4 min read",
          "category": "Menswear",
          "short": "A practical guide to pairing earth tones, neutrals, and casual layers for everyday menswear.",
          "full": "A practical guide to pairing earth tones, neutrals, and casual layers for everyday menswear. Building a functional wardrobe comes down to versatile pieces that easily layer together. Explore how combining neutral base tees with corduroy overshirts, olive cargos, relaxed denim, and crisp white sneakers allows you to build endless low-effort, high-style outfits for any day of the week."
        },
        {
         "title": "Balletcore Aesthetic: Soft, Feminine & Elegant Outfit Ideas",
         "image": "images/blog/bl11.jpg",
         "date": "11/08",
         "time": "4 min read",
         "category": "Trends",
         "short": "Embrace grace and delicacy with wrap tops, tulle skirts, leg warmers, and ballet flats.",
         "full": "Embrace grace and delicacy with wrap tops, tulle skirts, leg warmers, and ballet flats. Balletcore brings dance studio elegance to everyday street style using pastel pinks, creamy whites, soft ribbon accents, and cozy knit layers. Discover how to style these romantic, off-duty dancer silhouettes for a dreamy, effortlessly feminine aesthetic."
        },
        {
          "title": "How to Style Downtown Girl Aesthetics: Leather, Denim & Band Tees",
          "image": "images/blog/bl13.jpg",
          "date": "10/08",
          "time": "3 min read",
          "category": "Streetwear",
          "short": "Channel low-key grunge with vintage band tees, distressed leather jackets, flared denim, and chunky boots.",
          "full": "Channel low-key grunge with vintage band tees, distressed leather jackets, flared denim, and chunky boots. The Downtown Girl look pairs effortlessly cool 90s vintage elements with modern street style essentials. Learn how to accessorize with chunky headphones, hair clips, and lived-in footwear for an authentic, moody aesthetic."
        },
        {
          "title": "Dark Casual Menswear: Oversized Layers & Baggy Silhouettes",
          "image": "images/blog/bl14.jpg",
          "date": "09/08",
          "time": "4 min read",
          "category": "Menswear",
          "short": "Master modern streetwear featuring relaxed-fit cargos, washed denim, dark hoodies, and understated layers.",
          "full": "Master modern streetwear featuring relaxed-fit cargos, washed denim, dark hoodies, and understated layers. Deep charcoal, faded black, and muted olive tones form the foundation for this effortless, moody closet style. Explore essential styling formulas built around wide-leg trousers, graphic sweaters, and clean varsity jackets."
        },
        {
          "title": "The Ultimate 90s Grunge & Skater Wardrobe Guide",
          "image": "images/blog/bl12.jpg",
          "date": "08/08",
          "time": "5 min read",
          "category": "Style Guide",
          "short": "A comprehensive look at pairing vintage band graphic tees, jorts, workwear jackets, and classic high-tops.",
          "full": "A comprehensive look at pairing vintage band graphic tees, jorts, workwear jackets, and classic high-tops. Rooted in alternative rock culture and skate park style, this aesthetic thrives on oversized silhouettes, heavy cotton fabrics, flannel layers, and worn-in canvas shoes. Find inspiration to mix-and-match graphic tops with baggy denim for an effortless daily outfit."
        }
];

const blogContainer = document.getElementById("blog");
const pagination = document.getElementById("pagination");

let currentPage = 1;
const postsPerPage = 2;
let filteredPosts = [...blogPosts];

// =========================
// TOASTS (shared pattern with about/contact pages)
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
    }, 2800);
}

// =========================
// BLOG RENDERING
// =========================
// NOTE: previously built via `blogContainer.innerHTML += ...` inside the
// forEach loop below. Each += re-parses the *entire* accumulated HTML
// string and re-creates every prior card as a new DOM node, which is
// wasteful and would silently drop any listeners attached to earlier
// cards. Now the markup is assembled into an array and written to the
// DOM once per render.
function displayBlogs() {
    const start = (currentPage - 1) * postsPerPage;
    const end = start + postsPerPage;
    const posts = filteredPosts.slice(start, end);

    const cardsHtml = posts.map((post, index) => `
        <div class="blog-box fade-in"
             style="animation-delay:${index * 0.2}s">

            <div class="blog-img">
                <img src="${post.image}" alt="${post.title}">
            </div>

            <div class="blog-details">

                <span class="category">
                    ${post.category}
                </span>

                <p class="read-time">
                    <i class="far fa-clock"></i>
                    ${post.time}
                </p>

                <h4>${post.title}</h4>

                <p>${post.short}</p>

                <a href="#"
                   class="read-more"
                   data-title="${post.title}">
                   CONTINUE READING
                </a>

            </div>

            <h1>${post.date}</h1>

        </div>
    `);

    blogContainer.innerHTML = cardsHtml.join("");

    addReadMoreEvents();
    displayPagination();
}

function displayPagination() {
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

    const buttonsHtml = [];
    for (let i = 1; i <= totalPages; i++) {
        buttonsHtml.push(`
            <a href="#"
               class="page-btn ${i === currentPage ? "active-page" : ""}"
               data-page="${i}">
               ${i}
            </a>
        `);
    }

    pagination.innerHTML = buttonsHtml.join("");

    document.querySelectorAll(".page-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.preventDefault();
            currentPage = Number(btn.dataset.page);
            displayBlogs();
        });
    });
}

const searchInput = document.getElementById("search-input");
const suggestionsBox = document.getElementById("search-suggestions");

searchInput.addEventListener("input", function () {

    const value = this.value.toLowerCase().trim();

    filteredPosts = blogPosts.filter(post =>
        post.title.toLowerCase().includes(value) ||
        post.category.toLowerCase().includes(value)
    );

    currentPage = 1;

    if (filteredPosts.length === 0) {
        blogContainer.innerHTML = `
            <div class="empty-blog">
                <i class="fas fa-search"></i>
                <h2>No blogs found</h2>
                <p>Try another keyword.</p>
            </div>
        `;
        pagination.innerHTML = "";
    } else {
        displayBlogs();
    }

    if (value === "") {
        suggestionsBox.style.display = "none";
        return;
    }

    const suggestions = blogPosts.filter(post =>
        post.title.toLowerCase().includes(value) ||
        post.category.toLowerCase().includes(value)
    );

    const suggestionsHtml = suggestions.slice(0, 5).map(post => `
        <div class="suggestion-item" data-title="${post.title}">
            <span class="suggestion-title">${post.title}</span>
            <span class="suggestion-category">${post.category}</span>
        </div>
    `);

    suggestionsBox.innerHTML = suggestionsHtml.join("");
    suggestionsBox.style.display = suggestions.length > 0 ? "block" : "none";

    document.querySelectorAll(".suggestion-item").forEach(item => {
        item.addEventListener("click", () => {
            const title = item.dataset.title;
            const post = blogPosts.find(p => p.title === title);

            searchInput.value = title;
            suggestionsBox.style.display = "none";

            filteredPosts = [post];
            currentPage = 1;
            displayBlogs();

            openModal(post);
        });
    });

});

// hide suggestions when clicking outside
document.addEventListener("click", e => {
    if (!e.target.closest(".search-box")) {
        suggestionsBox.style.display = "none";
    }
});

const modal = document.getElementById("blog-modal");
const modalTitle = document.getElementById("modal-title");
const modalText = document.getElementById("modal-text");
const modalImage = document.getElementById("modal-image");
const modalDate = document.getElementById("modal-date");

function openModal(post) {
    modalTitle.textContent = post.title;
    modalDate.textContent = "Published: " + post.date;
    modalText.textContent = post.full;
    modalImage.src = post.image;
    modalImage.alt = post.title;
    modal.style.display = "block";
}

function addReadMoreEvents() {
    document.querySelectorAll(".read-more").forEach(button => {
        button.addEventListener("click", e => {
            e.preventDefault();
            const title = button.dataset.title;
            const post = blogPosts.find(p => p.title === title);
            openModal(post);
        });
    });
}

document.getElementById("close-modal").addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", e => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        modal.style.display = "none";
    }
});

displayBlogs();

// =========================
// NEWSLETTER
// (Previously the newsletter section was static markup with no <form>,
// no ids, and no JS at all — the button was decorative.)
// =========================
const newsletterForm = document.getElementById("newsletter-form");

if (newsletterForm) {

    const newsletterInput = document.getElementById("newsletter-email");
    const newsletterError = document.getElementById("newsletter-error");
    const newsletterBtn = document.getElementById("newsletter-submit");
    const newsletterLabel = newsletterBtn.querySelector(".btn-label");

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function showFieldError(message) {
        newsletterError.textContent = message;
        newsletterError.classList.add("show");
        newsletterInput.classList.add("invalid");
        newsletterInput.setAttribute("aria-invalid", "true");
    }

    function clearFieldError() {
        newsletterError.textContent = "";
        newsletterError.classList.remove("show");
        newsletterInput.classList.remove("invalid");
        newsletterInput.removeAttribute("aria-invalid");
    }

    newsletterInput.addEventListener("input", () => {
        if (newsletterInput.value.trim() === "" || isValidEmail(newsletterInput.value.trim())) {
            clearFieldError();
        }
    });

    newsletterForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const value = newsletterInput.value.trim();

        if (value === "") {
            showFieldError("Enter your email address.");
            newsletterInput.focus();
            return;
        }

        if (!isValidEmail(value)) {
            showFieldError("Enter a valid email address.");
            newsletterInput.focus();
            return;
        }

        clearFieldError();
        newsletterBtn.disabled = true;
        const originalLabel = newsletterLabel.textContent;
        newsletterLabel.textContent = "Signing up...";

        try {
            let subscribers = JSON.parse(localStorage.getItem("newsletterSubscribers")) || [];

            if (subscribers.includes(value)) {
                showToast("You're already signed up!", "default");
            } else {
                subscribers.push(value);
                localStorage.setItem("newsletterSubscribers", JSON.stringify(subscribers));
                showToast("You're subscribed! Watch your inbox for offers.", "default");
                newsletterForm.reset();
            }
        } catch (err) {
            showToast("Something went wrong. Try again in a moment.", "error");
        } finally {
            newsletterBtn.disabled = false;
            newsletterLabel.textContent = originalLabel;
        }
    });

}