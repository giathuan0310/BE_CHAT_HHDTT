const User = require("../models/User");
const express = require('express');
const bcrypt = require('bcryptjs');
const { upload } = require('../middlewares/multerCloudiary');
const router = express.Router();

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password -resetPasswordToken -resetPasswordExpires"); // Ẩn thông tin nhạy cảm
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, phone, password } = req.body;

    // Kiểm tra nếu có file avatar được upload
    let updatedFields = {
      username,
      phone,
    };

    // Kiểm tra nếu có mật khẩu, mã hóa mật khẩu trước khi lưu
    if (password) {
      const salt = await bcrypt.genSalt(10); // Tạo salt với số vòng lặp là 10
      const hashedPassword = await bcrypt.hash(password, salt); // Mã hóa mật khẩu
      updatedFields.password = hashedPassword; // Lưu mật khẩu đã mã hóa
     
    }


    if (req.file) {
      updatedFields.avatar = req.file.path; // Lưu đường dẫn ảnh từ Cloudinary
    }

    const updatedUser = await User.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUserById,
  updateUser,
};
