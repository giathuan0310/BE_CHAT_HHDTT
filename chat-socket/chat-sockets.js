const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const chatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected: " + socket.id);

    // Nhận tin nhắn mới và broadcast về conversation đó
    socket.on("sendMessage", async (data) => {
      try {
        const {
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
        } = data;

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
        // Lấy conversation hiện tại
        const conversation = await Conversation.findById(conversationId);

        // Cập nhật unreadCounts
        const updatedUnreadCounts = conversation.unreadCounts.map((item) => {
          if (item.userId.toString() !== senderId.toString()) {
            return {
              userId: item.userId,
              count: item.count + 1,
            };
          }
          if (item.userId.toString() === senderId.toString()) {
            return {
              userId: item.userId,
              count: 0,
            };
          }
          return item;
        });

        // Nếu có thành viên chưa nằm trong danh sách unreadCounts thì thêm vào
        conversation.members.forEach((memberId) => {
          if (
            memberId.toString() !== senderId.toString() &&
            !updatedUnreadCounts.some(
              (uc) => uc.userId.toString() === memberId.toString()
            )
          ) {
            updatedUnreadCounts.push({ userId: memberId, count: 1 });
          }
        });

        // Update conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          latestmessage: text,
          lastMessageSenderId: senderId,
          lastMessageId: savedMessage._id,
          lastMessageTime: new Date(),
          unreadCounts: updatedUnreadCounts,
        });
        let replyMessage = null;
        if (replyTo) {
          replyMessage = await Message.findById(replyTo).populate({
            path: "senderId",
            select: "_id username avatar",
          });
        }
        const populatedMessage = await savedMessage.populate({
          path: "senderId",
          select: "_id username avatar",
        });

        // Phát realtime về tất cả client đang nghe
        io.emit(`receiveMessage-${conversationId}`, {
          ...populatedMessage.toObject(),
          sender: populatedMessage.senderId, // Trả ra dưới dạng sender
          replyTo: replyMessage,
        });
        // Emit thêm sự kiện conversationUpdated
        io.emit("conversationUpdated", {
          conversationId,
        });
      } catch (err) {
        console.error("Send message error:", err);
      }
    });
    socket.on("markAsSeen", async ({ conversationId, userId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const newUnreadCounts = conversation.unreadCounts.map((item) =>
          item.userId.toString() === userId.toString()
            ? { ...item.toObject(), count: 0 }
            : item.toObject()
        );

        await Conversation.findByIdAndUpdate(conversationId, {
          unreadCounts: newUnreadCounts,
        });

        io.emit("conversationUpdated", { conversationId });
      } catch (err) {
        console.error("Mark as seen error:", err);
      }
    });
    socket.on("deleteChat", async ({ conversationId }) => {
      try {
        // Xóa conversation trong DB
        await Conversation.findByIdAndDelete(conversationId);
        // Xóa tất cả tin nhắn thuộc conversation
        await Message.deleteMany({ conversationId });
        console.log("Deleted chat: ", conversationId);
        // Phát thông báo tới tất cả client để cập nhật UI
        io.emit("chatDeleted", { conversationId });
      } catch (err) {
        console.error("Delete chat error:", err);
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
