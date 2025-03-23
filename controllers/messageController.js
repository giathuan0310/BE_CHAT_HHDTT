const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// Lấy danh sách messages của một cuộc trò chuyện
const getMessagesByConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .populate("senderId", "username avatar")
      .populate("replyTo")
      .sort({ createdAt: 1 }); // sort theo thời gian tăng dần
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tạo message mới
const createMessage = async (req, res) => {
  try {
    const { conversationId, senderId, messageType, text, imageUrl, videoUrl, fileUrl, fileName, iconCode, replyTo } = req.body;

    const newMessage = new Message({
      conversationId,
      senderId,
      messageType,
      text,
      imageUrl,
      videoUrl,
      fileUrl,
      fileName,
      iconCode,
      replyTo: replyTo || null,
    });

    const savedMessage = await newMessage.save();

    // Cập nhật latest message cho conversation
    let latestText = "";
    switch (messageType) {
      case "text":
        latestText = text;
        break;
      case "image":
        latestText = "📷 Hình ảnh";
        break;
      case "video":
        latestText = "🎥 Video";
        break;
      case "file":
        latestText = "📁 Tệp tin";
        break;
      case "icon":
        latestText = "😊 Biểu tượng";
        break;
      default:
        latestText = "Tin nhắn mới";
    }

    await Conversation.findByIdAndUpdate(conversationId, { latestmessage: latestText, updatedAt: Date.now() });

    res.status(201).json(savedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMessagesByConversation,
  createMessage,
};
