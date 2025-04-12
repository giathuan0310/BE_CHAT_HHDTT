const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversationController");

router.post("/create", conversationController.createConversation);
router.get("/:userId", conversationController.getUserConversationsWithMessages);
router.get("/:userId/search", conversationController.getUserConversationsWithMessagesSearch);
router.put("/:id", conversationController.updateConversationMembers);
router.get("/get/:id", conversationController.getConversationById);

module.exports = router;
