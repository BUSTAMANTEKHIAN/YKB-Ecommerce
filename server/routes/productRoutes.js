const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const productController = require("../controllers/productController");

// ===========================
// Multer Configuration
// ===========================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../../client/images/products"));
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// ===========================
// Product Routes
// ===========================
router.get("/", productController.getProducts);

router.get("/:id", productController.getProductById);

router.post("/", productController.addProduct);

router.put("/:id", productController.updateProduct);

router.delete("/:id", productController.deleteProduct);

// ===========================
// Upload Image
// ===========================
router.post("/upload", upload.single("image"), (req, res) => {
    res.json({
        success: true,
        imagePath: `images/products/${req.file.filename}`
    });
});

module.exports = router;