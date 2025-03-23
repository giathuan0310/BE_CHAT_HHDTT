const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversationController");

router.post("/create", conversationController.createConversation);
router.get("/:userId", conversationController.getUserConversationsWithMessages);

module.exports = router;
