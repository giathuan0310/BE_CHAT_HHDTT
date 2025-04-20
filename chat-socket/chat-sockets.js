const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const User = require("../models/User");

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
            memberId.toString() !== senderId?.toString() &&
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
    socket.on("deleteChatWithMe", async ({ conversationId, userId }) => {
      try {
        // Xóa cuộc trò chuyện trong DB
        await Conversation.updateOne(
          { _id: conversationId },
          { $addToSet: { deleteBy: userId } } // Thêm vào mảng deleteBy nếu chưa có
        );
        await Message.updateMany(
          { conversationId },
          { $addToSet: { deletedFrom: userId } }
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
        const user = await User.findById(userId);
        const lastMess = new Message({
          conversationId,
          // senderId: userId,
          messageType: "system",
          text: `${user.username} đã rời nhóm`,
        });
        await lastMess.save(); // Lưu tin nhắn vào DB
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
            lastMessageId: lastMess._id,
            lastMessageTime: new Date(),
            latestmessage: lastMess.text,
          }
        );

        // Phát sự kiện cập nhật UI cho các thành viên còn lại
        io.emit("groupUpdated", {
          conversationId, 
          latestmessage: lastMess.text,
          leftMembers: {
            userId,
            leftAt: new Date(),
            lastMessageId: lastMessage._id,
          },
         });

        console.log(`Người dùng ${userId} đã rời nhóm ${conversationId}`);
      } catch (error) {
        console.error("Lỗi khi rời nhóm:", error);
      }
    });

    // Thêm thành viên vào nhóm
    socket.on("addMembersToGroup", async ({ conversationId, newMemberIds, addedBy }) => {
      const user = await User.findById(addedBy);

      try {
        const lastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1 })
          .select("_id");

        // Lấy thông tin tất cả các thành viên mới được thêm vào
        const addedUsers = await User.find({ '_id': { $in: newMemberIds } });

        // Tạo danh sách tin nhắn cho từng thành viên
        const systemMessages = await Promise.all(addedUsers.map(async (addedUser) => {
          const lastMess = new Message({
            conversationId,
            messageType: "system",
            text: `${addedUser.username} đã được thêm vào nhóm bởi ${user.username}`,
          });
          await lastMess.save(); // Lưu tin nhắn vào DB
          return lastMess; // Trả về tin nhắn đã lưu
        }));

        // Tạo danh sách các thành viên được thêm kèm thông tin
        const addMembersData = newMemberIds.map((id, index) => ({
          userId: id,
          addBy: addedBy,
          lastMessageId: systemMessages[index]._id, // Gắn tin nhắn cho từng thành viên
          lastMessageTime: new Date(),
          addedAt: new Date(),
        }));

        await Conversation.updateOne(
          { _id: conversationId },
          {
            $addToSet: { members: { $each: newMemberIds } },
            $push: {
              addMembers: { $each: addMembersData }, // thêm danh sách nhiều người
            },
            lastMessageId: systemMessages[systemMessages.length - 1]._id,
            latestmessage: systemMessages[systemMessages.length - 1].text,
            lastMessageTime: new Date(),
          }
        );

        console.log("Thêm thành viên vào nhóm thành công:", addMembersData);

        // Phát sự kiện cập nhật UI cho các thành viên còn lại
        io.emit("groupUpdatedAdd", {
          conversationId,
          newMembers: addMembersData,
          latestmessage: systemMessages.map(msg => msg.text).join(' | '), // Kết hợp các tin nhắn thành một chuỗi
        });
      } catch (error) {
        console.error("Lỗi khi thêm thành viên vào nhóm:", error);
      }
    });


    // Tạo nhóm
    socket.on("createGroup", async ({ conversationId, userId }) => {
      try {
        console.log("userId:", userId);
        const userNameFind = await User.findById(userId).select("username");
        const name = userNameFind.username;
        console.log("name:", name);

        const lastMessage = new Message({
          conversationId,
          // senderId: userId,
          messageType: "system",
          text: `Nhóm đã được tạo bởi ${name}`,
        });
        await lastMessage.save(); // Lưu tin nhắn vào DB
        await Conversation.updateOne(
          { _id: conversationId },
          {
            createGroup: {
              userId,
              createdAt: new Date(),
              lastMessageId: lastMessage._id,
            },
            groupLeader: userId, 
            lastMessageId: lastMessage._id,
            lastMessageTime: new Date(),
            lastMessageSenderId: userId,
            latestmessage: `Nhóm đã được tạo bởi ${name}`,
          }
        );

        // Phát sự kiện cập nhật UI cho các thành viên còn lại
        io.emit("updatedCreate", { conversationId });
        console.log("Nhóm đã được tạo thành công:", conversationId);
      } catch (error) {
        console.error("Lỗi khi thêm nhóm:", error);
      }
    });

    socket.on("messageUpdated", async ({ conversationId }) => {
      // Gửi thông báo cập nhật tin nhắn tới tất cả thành viên trong đoạn chat
      io.emit("refreshMessages", { conversationId });
      console.log("Message updated in conversation: " + conversationId);
    });

  
    socket.on("kickMember", async ({ conversationId, targetUserId, byUserId }) => {
      console.log("Kick member event received:", {
        conversationId,
        targetUserId,
        byUserId,
      });
      try {
        const conversation = await Conversation.findById(conversationId)
          .populate("groupLeader")
          .populate("groupDeputies");

        if (!conversation) return;

        const isLeader = String(conversation.groupLeader._id) === String(byUserId);
        const isDeputy = conversation.groupDeputies.some(
          deputy => String(deputy._id) === String(byUserId)
        );
        const isTargetLeader = String(conversation.groupLeader._id) === String(targetUserId);
        const isTargetDeputy = conversation.groupDeputies.some(
          deputy => String(deputy._id) === String(targetUserId)
        );

        // Không có quyền
        if (!isLeader && !isDeputy) {
          socket.emit("kickMemberResponse", { error: "Không có quyền xóa thành viên" });
          return;
        }

        // Trưởng nhóm không thể tự xóa chính mình
        if (isLeader && String(byUserId) === String(targetUserId)) {
          socket.emit("kickMemberResponse", { error: "Trưởng nhóm không thể tự xóa chính mình" });
          return;
        }

        // Phó nhóm không được xóa trưởng nhóm
        if (isDeputy && isTargetLeader) {
          socket.emit("kickMemberResponse", { error: "Phó nhóm không được xóa trưởng nhóm" });
          return;
        }

        // Phó nhóm không được xóa phó nhóm khác
        if (isDeputy && isTargetDeputy) {
          socket.emit("kickMemberResponse", { error: "Phó nhóm không được xóa phó nhóm khác" });
          return;
        }

        const user = await User.findById(targetUserId);
        const lastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1 })
          .select("_id");

        const systemMessage = new Message({
          conversationId,
          messageType: "system",
          text: `${user.username} đã bị xóa khỏi nhóm`,
        });

        await systemMessage.save();

        await Conversation.updateOne(
          { _id: conversationId },
          {
            $pull: {
              members: targetUserId,
              groupDeputies: targetUserId, // 👈 Gỡ quyền phó nhóm nếu có
             },
            $push: {
              leftMembers: {
                userId: targetUserId,
                leftAt: new Date(),
                lastMessageId: lastMessage?._id || null,
              },
            },
            lastMessageId: systemMessage._id,
            lastMessageTime: new Date(),
            latestmessage: systemMessage.text,
          }
        );
        // Khi thành công
        socket.emit("kickMemberResponse", { success: true });

        io.emit("groupUpdatedKick", { conversationId, targetUserId });


        console.log(`Người dùng ${targetUserId} đã bị xóa khỏi nhóm ${conversationId}`);
      } catch (error) {
        console.error("Lỗi khi xóa thành viên khỏi nhóm:", error);
      }
    });



    socket.on("toggleDeputy", async ({ conversationId, targetUserId, byUserId }) => {
      console.log("Toggle deputy event received:", {
        conversationId,
        targetUserId,
        byUserId,
      });
      try {
        const conversation = await Conversation.findById(conversationId)
          .populate("groupLeader")
          .populate("groupDeputies");

        if (!conversation) return;

        const isLeader = String(conversation.groupLeader._id) === String(byUserId);
        if (!isLeader) {
          console.log("Chỉ trưởng nhóm mới có quyền cấp/thu hồi quyền phó nhóm");
          return;
        }

        const isDeputy = conversation.groupDeputies.some(
          deputy => String(deputy._id) === String(targetUserId)
        );

        let actionMessage = "";

        if (isDeputy) {
          // Thu hồi quyền
          await Conversation.updateOne(
            { _id: conversationId },
            { $pull: { groupDeputies: targetUserId } }
          );
          actionMessage = "đã bị thu hồi quyền phó nhóm";
        } else {
          // Cấp quyền
          await Conversation.updateOne(
            { _id: conversationId },
            { $addToSet: { groupDeputies: targetUserId } }
          );
          actionMessage = "đã được cấp quyền phó nhóm";
        }

        const user = await User.findById(targetUserId);
        const message = new Message({
          conversationId,
          messageType: "system",
          text: `${user.username} ${actionMessage}`,
        });

        await message.save();

        await Conversation.updateOne(
          { _id: conversationId },
          {
            lastMessageId: message._id,
            lastMessageTime: new Date(),
            latestmessage: message.text,
          }
        );

        io.emit("groupUpdatedToggleDeputy", { conversationId, targetUserId });

        console.log(`${user.username} ${actionMessage}`);
      } catch (error) {
        console.error("Lỗi toggle quyền phó nhóm:", error);
      }
    });


    socket.on("disbandGroup", async ({ conversationId, userId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // Kiểm tra quyền nhóm trưởng
        if (conversation.groupLeader.toString() !== userId.toString()) {
          return socket.emit("errorMessage", {
            message: "Bạn không có quyền giải tán nhóm này.",
          });
        }

        const user = await User.findById(userId);

        // Gửi tin nhắn hệ thống thông báo giải tán
        const systemMessage = new Message({
          conversationId,
          messageType: "system",

          text: `Nhóm đã bị giải tán bởi trưởng nhóm ${user.username}`,
        });
        await systemMessage.save();

        // Cập nhật conversation
        conversation.isDissolved = true;
        // conversation.members = [];
        conversation.latestmessage = systemMessage.text;
        conversation.lastMessageId = systemMessage._id;
        conversation.lastMessageTime = new Date();
        await conversation.save();

        // Gửi sự kiện về tất cả client
        io.emit("groupDisbanded", {
          conversationId,
          message: systemMessage.text,
          systemMessage, // gửi toàn bộ object message
        });

        console.log(`✔️ Nhóm ${conversationId} đã bị giải tán bởi ${user.username}`);
      } catch (err) {
        console.error("❌ Lỗi khi giải tán nhóm:", err);
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
