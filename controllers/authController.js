
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendVerificationEmail = require("../service/sendEmail");
const crypto = require("crypto");


let refreshTokens = [];
const authController={

    //Register
    // registerUser: async(req,res)=>{
    //   try {
    //     const { username, email, password } = req.body;
    
    //     // 1. Kiểm tra email đã tồn tại
    //     const existingUser = await User.findOne({ email });
    //     if (existingUser) {
    //       return res.status(400).json({ message: "Email đã tồn tại." });
    //     }
    
    //     // 2. Mã hóa password
    //     const salt = await bcrypt.genSalt(10);
    //     const hashedPassword = await bcrypt.hash(password, salt);
    
    //     // 3. Tạo user mới
    //     const newUser = new User({
    //       username,
    //       email,
    //       password: hashedPassword,
    //     });
    
    //     // 4. Lưu vào database
    //     const user = await newUser.save();
    
    //     // 5. Tạo token xác minh email
    //     const emailToken = jwt.sign(
    //       { id: user._id },
    //       process.env.JWT_EMAIL_SECRET,
    //       { expiresIn: "1h" }
    //     );
    //      // 6. Gửi email xác minh
    // try {
    //   await sendVerificationEmail(user.email, emailToken);
    //   res.status(200).json({
    //     message: "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.",
    //   });
    // } catch (err) {
    //   await User.findByIdAndDelete(user._id); // Xóa user nếu gửi email thất bại
    //   res.status(500).json({
    //     message: "Gửi email xác minh thất bại. Vui lòng thử lại.",
    //   });
    // }
    //     } catch (err) {
    //         res.status(500).json(err)
    //     }

    // },

    // Register
registerUser: async (req, res) => {
  try {
    // const { username, email, password } = req.body;
    const { phone, email, password,username } = req.body;

    // 1. Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại." });
    }

     // Kiểm tra phone đã tồn tại
     const existingPhone = await User.findOne({ phone });
     if (existingPhone) {
       return res.status(400).json({ message: "Số điện thoại đã tồn tại." });
     }


     // Tạo username mặc định nếu không cung cấp
    const generatedUsername = username || `Khach_${Date.now()}`;


    // 2. Mã hóa password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Tạo user mới
    // const newUser = new User({
    //   username,
    //   email,
    //   password: hashedPassword,
    // });

    const newUser = new User({
      phone,
      email,
      password: hashedPassword,
      username: generatedUsername,
    });
    // 4. Lưu vào database
    const user = await newUser.save();

    // 5. Tạo token xác minh email
    const emailToken = jwt.sign(
      { id: user._id },
      process.env.JWT_EMAIL_SECRET,
      { expiresIn: "1h" }
    );

    // 6. Tạo link xác minh
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${emailToken}`;

    // 7. Gửi email xác minh
    try {
      await sendVerificationEmail(user.email, verificationUrl);
      res.status(200).json({
        message: "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.",
      });
    } catch (err) {
      await User.findByIdAndDelete(user._id); // Xóa user nếu gửi email thất bại
      res.status(500).json({
        message: "Gửi email xác minh thất bại. Vui lòng thử lại.",
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
},

   
    // Verify email
verifyEmail: async (req, res) => {
  try {
    const { token } = req.params;

    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);

    // Tìm user theo ID
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ status: 'error', message: "Người dùng không tồn tại." });
    
    // Kiểm tra nếu email đã xác minh
    if (user.isVerified) return res.status(200).json({ status: 'already_verified', message: 'Email đã được xác minh.' });

    // Cập nhật trạng thái isVerified thành true
    user.isVerified = true;
    await user.save();

    res.status(200).json({ status: 'success', message: 'Email đã được xác minh thành công!' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ status: 'error', message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
},

    
    
    //Genegare AccessToken
    generateAccessToken: (user)=>{
      return jwt.sign(
        {
          id:user.id,
          isAdmin:user.isAdmin
        },
       process.env.JWT_ACCESS_kEY,
       //thoi gian hoat dong 
       {expiresIn: "30s"}
      );
    },
    //Genegare RefreshToken
    generateRefreshToken: (user)=>{
      return jwt.sign(
        {
          id:user.id,
          isAdmin:user.isAdmin
        },
       process.env.JWT_REFRESH_kEY,
       //thoi gian hoat dong 
       {expiresIn: "365d"}
      );
    },
    
    //Login
    loginUser: async(req,res)=>{
      try {
          const user = await User.findOne({ email: req.body.email });
          if (!user) {
              return res.status(404).json("Incorrect email!");
          }
  
         
          if (!user.isVerified) {
            console.log("isVerified:", user.isVerified);  // Thêm dòng này để kiểm tra
              return res.status(400).json({message:"Email chưa được xác minh. Vui lòng kiểm tra email của bạn để xác minh tài khoản."});
          }
          
          user.isOnline = true;
          await user.save();
          // Compare password
          const validPassword = await bcrypt.compare(
              req.body.password,
              user.password
          );
          if (!validPassword) {
              return res.status(404).json("Incorrect password");
          }
  
          if (user && validPassword) {
              const accessToken = authController.generateAccessToken(user);
              const refreshToken = authController.generateRefreshToken(user);
              
              // Save refresh token in cookies
              res.cookie("refreshToken", refreshToken, {
                  httpOnly: true,
                  secure: false,
                  path: "/",
                  sameSite: "strict",
              });
  
              // Return user data without password
              const { password, ...others } = user._doc;
              res.status(200).json({ ...others, accessToken });
          }
      } catch (err) {
          res.status(500).json(err);
      }
  },
  

    requestRefreshToken: async (req, res) => {
      //Take refresh token from user
      const refreshToken = req.cookies.refreshToken;
      //Send error if token is not valid
      if (!refreshToken) return res.status(401).json("You're not authenticated");
      // if (!refreshTokens.includes(refreshToken)) {
      //   return res.status(403).json("Refresh token is not valid");
      // }
      jwt.verify(refreshToken, process.env.JWT_REFRESH_kEY, (err, user) => {
        if (err) {
          console.log(err);
        }
        refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
        //create new access token, refresh token and send to user
        const newAccessToken = authController.generateAccessToken(user);
        const newRefreshToken = authController.generateRefreshToken(user);
        refreshTokens.push(newRefreshToken);
        res.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure:false,
          path: "/",
          sameSite: "strict",
        });
        res.status(200).json({
          accessToken: newAccessToken,
          
        });
      });
    },


//LOG OUT
logOut: async (req, res) => {
  //Clear cookies when user logs out
  refreshTokens = refreshTokens.filter((token) => token !== req.body.token);
  res.clearCookie("refreshToken");
  res.status(200).json("Logged out successfully!");
},

// Gửi yêu cầu khôi phục mật khẩu

forgotPassword : async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra nếu email tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại." });
    }

    // Tạo token khôi phục mật khẩu
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 phút

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = tokenExpiry;
    await user.save();

    // Gửi email khôi phục
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendVerificationEmail(user.email, resetUrl, "Khôi phục mật khẩu", "Nhấp vào liên kết dưới đây để đặt lại mật khẩu:");

    res.status(200).json({ message: "Liên kết khôi phục mật khẩu đã được gửi." });
  } catch (err) {
    res.status(500).json({ message: "Đã xảy ra lỗi. Vui lòng thử lại sau." });
  }
},

// Đặt lại mật khẩu
resetPassword : async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword,confirmPassword } = req.body;


    if(newPassword != confirmPassword){
      return res.status(400).json({message:"Mật khẩu và mật khẩu xác nhận không khớp."})
    }
    // Hash token và kiểm tra trong cơ sở dữ liệu
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }

    // Cập nhật mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Đặt lại mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Đã xảy ra lỗi. Vui lòng thử lại sau." });
  }
}


}



module.exports= authController