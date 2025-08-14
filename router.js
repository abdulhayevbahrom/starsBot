import express from "express";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Payment from "./models/Payments.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

router.post("/paynet", async (req, res) => {
  const { id, method, params } = req.body;

  try {
    if (!method) {
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Method ko‘rsatilmagan" },
      });
    }

    switch (method) {
      case "GetInformation": {
        if (!params?.fields?.order_id) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Majburiy parametrlar yo‘q" },
          });
        }

        let order_id = params.fields.order_id;
        const user = await Payment.findOne({ order_id, status: false });

        if (!user) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: 302,
              message: "Клиент не найден",
            },
          });
        }

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            status: "0",
            timestamp: dayjs()
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
            fields: {
              amount: user.amount,
            },
          },
        });
      }

      // === PERFORM TRANSACTION ===
      case "PerformTransaction": {
        if (!params?.fields?.order_id || !params?.amount) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Majburiy parametrlar yo‘q" },
          });
        }

        const exactUser = await Payment.findOne({
          order_id: params.fields.order_id,
          status: false,
        });

        if (!exactUser) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: 201,
              message: "Транзакция уже существует",
            },
          });
        }

        // Tiyinni so‘mga aylantirish
        const amountInUzs = params.amount / 100;

        if (exactUser.amount !== amountInUzs) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: 413, message: "Неверная сумма" },
          });
        }

        const existing = await Payment.findOne({
          transactionId: params.transactionId,
        });

        if (existing) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: 201,
              message: "Транзакция уже существует",
            },
          });
        }

        exactUser.status = true;
        exactUser.transactionId = params.transactionId;
        await exactUser.save();

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            timestamp: dayjs()
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
            providerTrnId: exactUser._id,
            fields: {
              message: "To‘lov muvaffaqiyatli amalga oshirildi",
            },
          },
        });
      }

      case "CheckTransaction": {
        const transaction = await Payment.findOne({
          transactionId: params.transactionId,
        });

        if (!transaction) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: 203, message: "Transakziya topilmadi" },
          });
        }

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            transactionState: transaction.status ? 1 : 2,
            timestamp: dayjs(transaction.updatedAt)
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
            providerTrnId: transaction._id,
          },
        });
      }

      case "GetStatement": {
        const { dateFrom, dateTo } = params;
        const transactions = await Payment.find({
          status: true,
          createdAt: {
            $gte: new Date(dateFrom),
            $lte: new Date(dateTo),
          },
        });

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            statements: transactions.map((item) => ({
              transactionId: item.transactionId,
              amount: item.amount * 100,
              providerTrnId: item._id,
              timestamp: dayjs(transactions.updatedAt)
                .tz("Asia/Tashkent")
                .format("YYYY-MM-DD HH:mm:ss"),
              providerTrnId: transactions._id,
            })),
          },
        });
      }

      default:
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: "So‘ralgan metod topilmadi" },
        });
    }
  } catch (err) {
    console.log(">>>>>>>>>>>>>>", err);
    return res.json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32603, message: "Tizim xatosi", err },
    });
  }
});

// module.exports = router;
export default router;
