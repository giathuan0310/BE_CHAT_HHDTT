const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

// Lấy danh sách message theo conversationId
router.get("/get/:conversationId", messageController.getMessagesByConversation);

// Tạo message mới
router.post("/create", messageController.createMessage);

module.exports = router;
