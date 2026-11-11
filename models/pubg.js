import mongoose from "mongoose";

const pubgSchema = new mongoose.Schema(
  {
    player_id: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "success", "failed", "reversed"],
    },
    admin_status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    admin_id: {
      type: String,
      default: null,
    },
    admin_action_at: {
      type: Date,
      default: null,
    },
    transId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerTrnId: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
    },
    price_amount: {
      type: Number,
      required: true,
    },
    from: {
      type: String,
      required: true,
    },
    player_name: {
      type: String,
      default: null,
    },
    telegram_chat_id: {
      type: String,
      default: null,
    },
    telegram_message_id: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("pubg", pubgSchema);
