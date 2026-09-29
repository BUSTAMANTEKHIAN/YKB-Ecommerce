const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const profileController = require("../controllers/profileController");
const authenticate = require("../middleware/authMiddleware");
const rateLimit = require("../middleware/rateLimit");

router.post("/register", rateLimit({ max: 5 }), authController.register);
router.post("/login", rateLimit({ max: 8 }), authController.login);
router.get("/profile", authenticate, profileController.getProfile);
router.put("/profile", authenticate, profileController.updateProfile);

module.exports = router;
