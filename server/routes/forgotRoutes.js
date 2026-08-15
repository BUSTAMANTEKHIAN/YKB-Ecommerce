const express = require("express");
const router = express.Router();

const forgotController = require("../controllers/forgotController");

router.post("/forgot-password", forgotController.forgotPassword);
router.post("/reset-password", forgotController.resetPassword);

module.exports = router;