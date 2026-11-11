import "dotenv/config";
import mongoose from "mongoose";
import { initPubgAdminBot } from "../bot/pubgAdmin.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    initPubgAdminBot();
    console.log("🟢 MongoDB ulandi");
  } catch (error) {
    console.error("🔴 MongoDB xatolik:", error.message);
    process.exit(1);
  }
};

export default connectDB;
