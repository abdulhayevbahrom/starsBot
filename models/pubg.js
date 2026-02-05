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
    transId: {
      type: String,
      required: true,
    },
    price_amount: {
      type: Number,
      required: true,
    },
    from: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("pubg", pubgSchema);
