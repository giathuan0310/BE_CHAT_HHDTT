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

const getUserConversationsWithMessagesSearch = async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversation.find({ members: userId }).populate({
      path: "members",
      select: "username avatar", // Chỉ lấy username và image
    });
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

//Thêm thành viên mới vào nhóm chat 
const updateConversationMembers = async (req, res) => {
  try {
    const { members, addBy, lastMessageId } = req.body;
    const conversationId = req.params.id;
    
    console.log("conversationId chat:", conversationId);

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy nhóm" });
    }

    // Lọc ra các ID chưa có trong nhóm
    const currentMemberIds = conversation.members.map((m) => m.toString());
    const newMembers = members.filter((id) => !currentMemberIds.includes(id));

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { members: { $each: newMembers } },
        $push: {
          addMembers: {
            userId: newMembers,
            addBy: addBy,
            lastMessageId: lastMessageId || null,
          },
        },
      },
      { new: true }
    );

    res.status(200).json(updatedConversation);
  } catch (err) {
    console.error("Lỗi cập nhật nhóm:", err);
    res.status(500).json({ message: "Lỗi cập nhật nhóm", error: err });
  }
};
// Lấy thông tin của một conversation theo ID
const getConversationById = async (req, res) => {
  try {
    const conversationId = req.params.id;
   
    const conversation = await Conversation.findById(conversationId)
      .populate("members", "username avatar isOnline") // Lấy thông tin user trong nhóm
      .populate("lastMessageSenderId", "username avatar")
      .populate("lastMessageId");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(500).json({ message: "Error fetching conversation", error: err });
  }
};


module.exports = {
  createConversation,
  getUserConversationsWithMessages,
  getUserConversationsWithMessagesSearch,
  updateConversationMembers,
  getConversationById,
};
