# 💬 Chat App HHDTT - Nền tảng nhắn tin thời gian thực đa nền tảng

**Chat App HHDTT** là một ứng dụng nhắn tin hiện đại, mạnh mẽ, được thiết kế để cung cấp trải nghiệm giao tiếp tức thì và an toàn cho người dùng. Với sự hỗ trợ đa nền tảng (Web và Mobile), Chat App HHDTT cho phép người dùng kết nối, trò chuyện 1-1, tham gia nhóm, chia sẻ đa phương tiện và quản lý bạn bè một cách dễ dàng.

---

## 🚀 Tính năng chính

### 👥 Người dùng

- **Xác thực an toàn:** Đăng ký, Đăng nhập, Khôi phục mật khẩu.
- **Quản lý hồ sơ:** Cập nhật thông tin cá nhân theo thời gian thực.
- **Nhắn tin 1-1:** Gửi tin nhắn cá nhân tức thời.
- **Nhắn tin nhóm:** Tạo nhóm, tham gia nhóm và trò chuyện với nhiều người.
- **Chia sẻ đa phương tiện:** Gửi ảnh, video và tệp đính kèm.
- **Tính năng tin nhắn nâng cao:**
    - **Ghim tin nhắn:** Giúp dễ dàng truy cập các thông tin quan trọng.
    - **Thu hồi tin nhắn:** Xóa tin nhắn đã gửi.
    - **Chuyển tiếp tin nhắn:** Chia sẻ tin nhắn nhanh chóng.
    - **Xóa tin nhắn (phía tôi):** Dọn dẹp cuộc trò chuyện cá nhân.
- **Quản lý bạn bè:**
    - **Kết bạn:** Gửi và chấp nhận yêu cầu kết bạn.
    - **Tìm kiếm bạn bè:** Dễ dàng tìm thấy người dùng khác.
    - **Xóa bạn bè:** Quản lý danh sách liên hệ.

### 🛡️ Quản lý nhóm

- **Tạo nhóm:** Khởi tạo các cuộc trò chuyện nhóm mới.
- **Thêm/Xóa thành viên:** Quản lý danh sách thành viên trong nhóm.
- **Rời nhóm:** Người dùng có thể chủ động rời khỏi nhóm.
- **Phân quyền Trưởng nhóm:** Gán vai trò quản lý cho thành viên để điều hành nhóm hiệu quả.

---

## 🧠 Công nghệ sử dụng

| Công nghệ | Mô tả |
|----------|--------|
| **Node.js + Express.js** | Backend API mạnh mẽ, xử lý logic nghiệp vụ |
| **MongoDB** | Cơ sở dữ liệu NoSQL linh hoạt |
| **React.js** | Giao diện người dùng Web động, responsive |
| **React Native** | Phát triển ứng dụng Mobile đa nền tảng |
| **Socket.io** | Hỗ trợ giao tiếp thời gian thực (Real-time) |
| **KeyCloak** | Xác thực và ủy quyền dựa trên vai trò (Role-based access control) |
| **JWT (JSON Web Tokens)** | Bảo mật phiên làm việc |
| **Bcrypt & Encrypt** | Mã hóa mật khẩu và dữ liệu an toàn |
| **AWS S3** | Lưu trữ đám mây cho các tệp đa phương tiện |
| **Cloudinary** | Quản lý và tối ưu hóa hình ảnh/video |
| **Vercel** | Triển khai Frontend Web |
| **Render** | Triển khai Backend API |
| **EAS (Expo Application Services)** | Xây dựng và triển khai ứng dụng React Native |
| **Postman** | Kiểm thử API |

---

## 📷 Giao diện minh họa (Tùy chọn)

> *(Bạn có thể chèn hình ảnh minh họa trang đăng nhập, màn hình chat 1-1, chat nhóm, danh sách bạn bè, cài đặt profile, v.v. để dự án trực quan hơn)*

---

## 🔗 Liên kết dự án

- **Frontend Repository (Web):** `https://github.com/giathuan0310/FE_CHAT_HHDTT.git`
- **Backend Repository:** `https://github.com/giathuan0310/BE_CHAT_HHDTT.git`
- **Web Demo:** `https://fe-chat-hhdtt-omega.vercel.app/`
- **Video Demo:** `https://youtu.be/cRGXNnpGr34`

---

# 🛠️ Hướng dẫn cài đặt và chạy dự án

Để chạy dự án này trên máy cục bộ, làm theo các bước sau:

## Clone dự án
```bash
git clone https://github.com/giathuan0310/FE_CHAT_HHDTT.git # Frontend
git clone https://github.com/giathuan0310/BE_CHAT_HHDTT.git # Backend
```

## Cài đặt Backend (Server)
```bash
cd BE_CHAT_HHDTT
npm install
# Tạo file .env và cấu hình biến môi trường (ví dụ: DB_URI, JWT_SECRET, Cloudinary_API_KEY, etc.)
npm start # Hoặc npm run dev nếu có script phát triển
```

## Cài đặt Frontend (Web)
```bash
cd FE_CHAT_HHDTT
npm install
# Tạo file .env và cấu hình biến môi trường (ví dụ: REACT_APP_API_URL, etc.)
npm start # Hoặc npm run dev
```

## Cài đặt Mobile (React Native)
*(Hướng dẫn này giả định bạn đã có môi trường React Native/Expo CLI được thiết lập)*
```bash
cd # Đường dẫn đến thư mục dự án React Native (nếu có riêng)
npm install
# Cấu hình file .env tương tự như Web
npm start
