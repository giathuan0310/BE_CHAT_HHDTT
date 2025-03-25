const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Tạo conversation mới
const createConversation = async (req, res) => {
  try {
    const { members, isGroup, name, groupAvatar } = req.body;

    if (isGroup && !name) {
      return res.status(400).json({ message: "Group name is required." });
    }

    const newConversation = new Conversation({
      members,
      isGroup,
      name: isGroup ? name : undefined,
      groupAvatar: groupAvatar || "",
    });

    const savedConversation = await newConversation.save();
    res.status(201).json(savedConversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy danh sách conversation + danh sách message con của mỗi conversation
const getUserConversationsWithMessages = async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversation.find({ members: userId });
    // Lấy message con cho từng conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await Message.find({ conversationId: conv._id })
          .sort({ createdAt: 1 })
          .limit(30); // chỉ lấy 30 tin nhắn gần nhất, có thể điều chỉnh

        return {
          ...conv._doc,
          messages,
        };
      })
    );

    res.status(200).json(conversationsWithMessages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createConversation,
  getUserConversationsWithMessages,
};
