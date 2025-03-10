const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authRoute= require("./routes/auth");


dotenv.config();

const app = express();

// Kết nối MongoDB với async/await
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Thoát nếu không kết nối được
  }
};

// Gọi hàm kết nối
connectDB();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use(cors({ origin: 'http://localhost:3000' }));


//Router
app.use("/v1/auth",authRoute);


const PORT = process.env.PORT ;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

