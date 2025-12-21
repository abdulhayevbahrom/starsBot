import mongoose from "mongoose";

const mlbbSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    zone_id: {
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
    transId: {
      type: String,
      required: true,
    },
    price_amount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("MLBB", mlbbSchema);
