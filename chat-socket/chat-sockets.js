const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const chatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected: " + socket.id);

    // Nhận tin nhắn mới và broadcast về conversation đó
    socket.on("sendMessage", async (data) => {
      try {
        const { conversationId, senderId, messageType, text, imageUrl, videoUrl, fileUrl, fileName, iconCode, replyTo } = data;

        // Tạo tin nhắn mới trong DB
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
          replyTo,
        });

        const savedMessage = await newMessage.save();
        await Conversation.findByIdAndUpdate(conversationId, {
          latestmessage : text,
          lastMessageSenderId: senderId,
          lastMessageId: savedMessage._id,
      });
      const populatedMessage = await savedMessage.populate({
        path: "senderId",
        select: "_id username avatar",
      });
 
        // Phát realtime về tất cả client đang nghe
        io.emit(`receiveMessage-${conversationId}`, {
          ...populatedMessage.toObject(),
          sender: populatedMessage.senderId, // Trả ra dưới dạng sender
        });
      } catch (err) {
        console.error("Send message error:", err);
      }
    });

    

    // Lắng nghe khi user xem tin nhắn (seen)
    socket.on("messageSeen", async ({ messageId, userId }) => {
      try {
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { $push: { seenBy: { user: userId, seenAt: new Date() } } },
          { new: true }
        );
        if (updatedMessage) {
          io.emit(`messageSeen-${updatedMessage.conversationId}`, {
            messageId,
            userId,
            seenAt: new Date(),
          });
        }
      } catch (err) {
        console.error("Message seen error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected: " + socket.id);
    });
  });
};

module.exports = chatSocket;
