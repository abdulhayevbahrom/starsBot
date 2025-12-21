import "dotenv/config";
import mongoose from "mongoose";
import initPricingBot from "../bot/bot.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    initPricingBot({
      token: process.env.BOT_TOKEN,
      adminIds: process.env.ADMIN_IDS.split(","),
    });
    console.log("🟢 MongoDB ulandi");
  } catch (error) {
    console.error("🔴 MongoDB xatolik:", error.message);
    process.exit(1);
  }
};

export default connectDB;
