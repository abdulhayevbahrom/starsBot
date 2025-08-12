// const mongoose = require('mongoose');
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🟢 MongoDB ulandi");
  } catch (error) {
    console.error("🔴 MongoDB xatolik:", error.message);
  }
};

export default connectDB;
