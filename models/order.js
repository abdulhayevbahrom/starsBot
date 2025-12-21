import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Qidiruvni tezlashtirish
    },
    productType: {
      type: String,
      required: true,
      enum: ["stars", "premium"], // Faqat ruxsat etilgan qiymatlar
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    tonAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "success",
        "failed",
        "refunded",
        "completed",
        "reversed",
      ],
      default: "pending",
    },
    fragmentTx: {
      type: Object,
      default: {},
    },
    errorMessage: {
      type: String,
      default: null,
    },
    transId: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "orders",
    timestamps: true, // createdAt va updatedAt avtomatik
  }
);

// Index tez qidirish uchun
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

// Virtual field: Telegram username
orderSchema.virtual("telegramUsername").get(function () {
  return this.userId.startsWith("@") ? this.userId : `@${this.userId}`;
});

// Static method: User buyurtmalarini olish
orderSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method: Statistika olish
orderSchema.statics.getStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: "$productType",
        totalOrders: { $sum: 1 },
        totalTon: { $sum: "$tonAmount" },
        successCount: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
      },
    },
  ]);
};

export const Order = mongoose.model("Order", orderSchema);
