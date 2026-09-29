const express = require("express");
const router = express.Router();

const forgotController = require("../controllers/forgotController");
const rateLimit = require("../middleware/rateLimit");

router.post("/forgot-password", rateLimit({ max: 5 }), forgotController.forgotPassword);
router.post("/reset-password", rateLimit({ max: 8 }), forgotController.resetPassword);

module.exports = router;
