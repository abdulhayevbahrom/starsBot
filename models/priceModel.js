import mongoose from "mongoose";

const premiumSchema = new mongoose.Schema(
  {
    months: {
      type: Number,
      enum: [3, 6, 12],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    starPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    premium: {
      type: [premiumSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Premium pricing is required",
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Pricing", pricingSchema);
