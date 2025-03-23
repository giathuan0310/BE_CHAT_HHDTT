const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Lấy user theo id
router.get("/get/:id", userController.getUserById);

module.exports = router;
