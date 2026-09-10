const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const productController = require("../controllers/productController");

// ===============================
// CLOUDINARY CONFIG
// ===============================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// ===============================
// MULTER MEMORY STORAGE
// ===============================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }
    }
});

// ===============================
// PRODUCT ROUTES
// ===============================

router.get("/", productController.getProducts);

router.get("/:id", productController.getProductById);

router.post("/", productController.addProduct);

router.put("/:id", productController.updateProduct);

router.delete("/:id", productController.deleteProduct);

// ===============================
// CLOUDINARY IMAGE UPLOAD
// ===============================

router.post("/upload", upload.single("image"), async (req, res) => {

    try {

        // Check file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file uploaded."
            });
        }

        console.log("=================================");
        console.log("📸 IMAGE UPLOAD START");
        console.log("File:", req.file.originalname);
        console.log("Type:", req.file.mimetype);
        console.log("Size:", `${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log("Cloudinary Cloud:", process.env.CLOUDINARY_CLOUD_NAME);
        console.log("=================================");

        const result = await new Promise((resolve, reject) => {

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "ykb-clothing/products",
                    resource_type: "image",
                    timeout: 120000
                },

                (error, result) => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(result);
                }
            );

            uploadStream.on("error", (error) => {
                reject(error);
            });

            uploadStream.end(req.file.buffer);
        });

        console.log("=================================");
        console.log("✅ CLOUDINARY UPLOAD SUCCESS");
        console.log("Public ID:", result.public_id);
        console.log("URL:", result.secure_url);
        console.log("=================================");

        return res.status(200).json({
            success: true,
            message: "Image uploaded successfully!",
            imagePath: result.secure_url
        });

    } catch (error) {

        console.error("=================================");
        console.error("❌ CLOUDINARY UPLOAD FAILED");
        console.error("Message:", error.message);
        console.error("HTTP Code:", error.http_code);
        console.error("Name:", error.name);
        console.error("=================================");

        return res.status(500).json({
            success: false,
            message: error.message || "Image upload failed."
        });
    }
});

// ===============================
// MULTER ERROR HANDLER
// ===============================

router.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "Image is too large. Maximum size is 5 MB."
            });
        }

        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if (err) {

        console.error("Upload middleware error:", err);

        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
});

module.exports = router;