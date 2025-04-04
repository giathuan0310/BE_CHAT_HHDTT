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

    await Conversation.findByIdAndUpdate(conversationId, { 
      latestmessage: latestText, 
      lastMessageSenderId: senderId,
      lastMessageId: savedMessage._id,
      lastMessageTime: Date.now(),   // <== quan trọng, dùng để sort ở frontend
    });

    res.status(201).json(savedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { isPinned } = req.body;

    // Lấy tin nhắn hiện tại
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Nếu ghim tin nhắn, thì bỏ ghim các tin nhắn khác trong cùng conversation
    if (isPinned) {
      await Message.updateMany(
        { conversationId: message.conversationId },
        { $set: { isPinned: false } }
      );
    }

    // Ghim hoặc bỏ ghim tin nhắn
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { isPinned },
      { new: true }
    );

    res.status(200).json(updatedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const deleteMessageFrom = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body; // truyền userId vào body
    const conversationId = req.body.conversationId;
    const conversation = await Conversation.findById(conversationId);

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedFrom: userId } }, // tránh thêm trùng userId
      { new: true }
    );

    // nếu message.text trùng với lastMessage trong conversation thì xóa lastMessage
    if (updatedMessage.text === conversation.latestmessage) {
      await Conversation.findByIdAndUpdate(conversationId, {
        latestmessage: "",
      });
    }
    res.status(200).json(updatedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const recallMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const conversationId = req.body.conversationId;
    const message = await Message.findById(messageId);
    const conversation = await Conversation.findById(conversationId);
    if (!message) {
      return res.status(404).json({ message: "Tin nhắn không tồn tại" });
    }

    const createdAt = new Date(message.createdAt);
    const now = new Date();


    // nếu message.text trùng với lastMessage trong conversation thì xóa lastMessage
    if (message.text === conversation.latestmessage) {
      await Conversation.findByIdAndUpdate(conversationId, {
        latestmessage: "",
      });
    }
    const isSameDay =
      createdAt.getFullYear() === now.getFullYear() &&
      createdAt.getMonth() === now.getMonth() &&
      createdAt.getDate() === now.getDate();

    if (!isSameDay) {
      return res
        .status(400)
        .json({ message: "Chỉ có thể thu hồi tin nhắn trong ngày hiện tại" });
    }

    const recalledMessage = await Message.findByIdAndUpdate(
      messageId,
      { isRecalled: true, text: "" },
      { new: true }
    );

    res.status(200).json(recalledMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { replyTo } = req.body;
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { replyTo },
      { new: true }
    );
    res.status(200).json(updatedMessage);
  }
  catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upload File (Hình ảnh, Video, File)
// const { cloudinary, upload } = require("../config/cloudConfig");

const uploadFile = async (req, res) => {
  console.log("File nhận được:", req.file);
  console.log("Body:", req.body); // Kiểm tra conversationId, senderId

  let imageUrl = null;
  let videoUrl = null;
  let fileUrl = null;

  try {
    if (req.file.mimetype.startsWith("image")) {
      imageUrl = req.file.path || req.file.url || req.file.location;
    } else if (req.file.mimetype.startsWith("video")) {
      videoUrl = req.file.path || req.file.url || req.file.location;
    } else {
      fileUrl = req.file.path || req.file.url || req.file.location;
    }

    // Tạo object response chỉ chứa giá trị không null
    const response = {
      success: true,
      fileName: req.file.originalname,
    };

    if (imageUrl) response.imageUrl = imageUrl;
    if (videoUrl) response.videoUrl = videoUrl;
    if (fileUrl) response.fileUrl = fileUrl;

    return res.status(200).json(response);
  } catch (error) {
    console.error("Lỗi khi upload file:", JSON.stringify(error, null, 2));
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi upload file",
      error: error.toString(), // Trả về lỗi dạng string cho client dễ đọc
    });
  }
};




module.exports = {
  getMessagesByConversation,
  createMessage,
  pinMessage,
  deleteMessageFrom,
  recallMessage,
  replyToMessage,
  uploadFile,
 
};
