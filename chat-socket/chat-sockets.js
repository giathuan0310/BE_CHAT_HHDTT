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
          latestmessage: text || messageType,
          lastMessageSenderId: senderId,
          lastMessageId: savedMessage._id,
          lastMessageTime: new Date(),
          unreadCounts: updatedUnreadCounts,
          $set: { deleteBy: [] },
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
    socket.on("deleteChat", async ({ conversationId, userId }) => {
      try {
        // Xóa cuộc trò chuyện trong DB
        await Conversation.updateOne(
          { _id: conversationId },
          { $addToSet: { deleteBy: userId } } // Thêm vào mảng deleteBy nếu chưa có
        );
        // Phát thông báo tới tất cả client để cập nhật UI
        io.emit("chatDeleted", { conversationId, userId });
      } catch (err) {
        console.error("Delete chat error:", err);
      }
    });

    // Rời nhóm
    socket.on("leaveGroup", async ({ conversationId, userId }) => {
      try {
        const lastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1 })
          .select("_id");
        await Conversation.updateOne(
          { _id: conversationId },
          {
            $pull: { members: userId }, // Xóa khỏi danh sách thành viên
            $push: {
              leftMembers: {
                userId,
                leftAt: new Date(),
                lastMessageId: lastMessage._id,
              },
            }, // Thêm vào danh sách rời nhóm
          }
        );

        // Phát sự kiện cập nhật UI cho các thành viên còn lại
        io.emit("groupUpdated", { conversationId});

        console.log(`Người dùng ${userId} đã rời nhóm ${conversationId}`);
      } catch (error) {
        console.error("Lỗi khi rời nhóm:", error);
      }
    });
    //Thêm thành viên vào nhóm
    socket.on("addMembersToGroup", async ({ conversationId, newMemberIds, addedBy }) => {
      try {
        const lastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1 })
          .select("_id");

        const currentTime = new Date();
      

        // Tạo danh sách các thành viên được thêm kèm thông tin
        const addMembersData = newMemberIds.map((id) => ({
          userId: id,
          addBy: addedBy,
          lastMessageId: lastMessage ? lastMessage._id : null,
          addedAt: new Date(),
        }));

        await Conversation.updateOne(
          { _id: conversationId },
          {
            $addToSet: { members: { $each: newMemberIds } },
            $push: {
              addMembers: { $each: addMembersData }, // thêm danh sách nhiều người
            },
          }
        );
        console.log("Thêm thành viên vào nhóm thành công:", addMembersData);
        // Phát sự kiện cập nhật UI cho các thành viên còn lại
        io.emit("groupUpdatedAdd", { conversationId , newMembers: addMembersData });
   

      } catch (error) {
        console.error("Lỗi khi thêm thành viên vào nhóm:", error);
      }
    });




    socket.on("messageUpdated", async ({ conversationId }) => {
      // Gửi thông báo cập nhật tin nhắn tới tất cả thành viên trong đoạn chat
      io.emit("refreshMessages", { conversationId });
      console.log("Message updated in conversation: " + conversationId);
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
