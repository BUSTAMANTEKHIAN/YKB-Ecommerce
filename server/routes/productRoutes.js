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
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ===============================
// MULTER MEMORY STORAGE
// ===============================
// The image is temporarily stored in memory,
// then uploaded directly to Cloudinary.
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },

    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
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
// UPLOAD IMAGE TO CLOUDINARY
// ===============================

router.post("/upload", upload.single("image"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file uploaded."
            });
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "ykb-clothing/products",
                resource_type: "image"
            },

            (error, result) => {

                if (error) {
                    console.error("Cloudinary upload error:", error);

                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload image."
                    });
                }

                return res.json({
                    success: true,
                    message: "Image uploaded successfully!",
                    imagePath: result.secure_url
                });
            }
        );

        uploadStream.end(req.file.buffer);

    } catch (error) {

        console.error("Image upload error:", error);

        res.status(500).json({
            success: false,
            message: "Image upload failed."
        });
    }

});


// ===============================
// MULTER / UPLOAD ERROR HANDLER
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
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
});


module.exports = router;