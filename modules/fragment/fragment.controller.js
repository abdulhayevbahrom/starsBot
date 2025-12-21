import * as fragmentService from "./fragment.service.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { Order } from "../../models/order.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const buyStars = async (req, res) => {
  try {
    let { id } = req.body;
    const { username: userId, star: amount } = req.body.params.fields;
    let transactionId = req.body.params.transactionId;
    const existing = await Order.findOne({
      transId: transactionId,
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

    if (!userId || !amount) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Majburiy parametr yo‘q" },
      });
    }

    if (amount < 50 || amount > 10000) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: {
          code: 413,
          message:
            "Yulduzlar soni 50 dan kam bo'lmasligi va 10000 dan oshmasligi kerak",
        },
      });
    }

    const result = await fragmentService.buyStars(
      userId,
      amount,
      transactionId
    );

    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        status: "0",
        timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
        fields: {
          message: "Stars muvaffaqiyatli sotib olindi",
          // data: result,
        },
      },
    });
  } catch (error) {
    console.error("Stars sotib olishda xatolik:", error.message);
    return res.json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32603, message: "Tizim xatosi", error },
    });
  }
};

export const buyPremium = async (req, res) => {
  try {
    let { id } = req.body;
    const { username: userId, month: months } = req.body.params.fields;
    let transactionId = req.body.params.transactionId;

    const existing = await Order.findOne({
      transId: transactionId,
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

    if (!userId || !months) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Majburiy parametr yo‘q" },
      });
    }

    if (![3, 6, 12].includes(months)) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: {
          code: 413,
          message: "Month 3, 6 yoki 12 bo'lishi kerak",
        },
      });
    }

    const result = await fragmentService.buyPremium(
      userId,
      months,
      transactionId
    );

    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        status: "0",
        timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
        fields: {
          message: "Premium muvaffaqiyatli sotib olindi",
          // data: result,
        },
      },
    });
  } catch (error) {
    console.error("Premium sotib olishda xatolik:", error.message);
    return res.json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32603, message: "Tizim xatosi", error },
    });
  }
};

export const getAccount = async (req, res) => {
  try {
    const info = await fragmentService.getAccountInfo();

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error("Account ma'lumot olishda xatolik:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// export const checkTransaction = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const status = await fragmentService.checkTransaction(id);

//     res.json({
//       success: true,
//       data: status,
//     });
//   } catch (error) {
//     console.error("Transaction tekshirishda xatolik:", error.message);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// };

export const checkTransaction = async (req, res) => {
  try {
    let transactionId = req.body.params.transactionId;
    let transaction = await Order.findOne({ transId: transactionId });
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
  } catch (error) {
    console.error("Transaction tekshirishda xatolik:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
