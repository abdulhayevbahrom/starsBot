import fetch from "node-fetch";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Pricing from "../../models/priceModel.js";
import { buyStars, buyPremium } from "./fragment.service.js";
import { Order } from "../../models/order.js";

dayjs.extend(utc);
dayjs.extend(timezone);

class PaynetController {
  async getInformation(req, res) {
    try {
      let { id, params } = req.body;
      let { username, star, month } = params.fields;

      if (!username || (!star && !month)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      if (star && (star < 50 || star > 10000)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 301,
            message:
              "Yulduzlar soni 50 dan kam bo'lmasligi va 10000 dan oshmasligi kerak",
          },
        });
      }

      if (month && ![3, 6, 12].includes(+month)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 301,
            message: "Premium oy soni 3, 6 yoki 12 bo'lishi kerak",
          },
        });
      }

      const url = `${process.env.API_BASE}/star/recipient/search?username=${username}&quantity=50`;
      let headers = {
        "API-Key": process.env.API_KEY,
      };
      const response = await fetch(url, {
        headers,
      });

      let data = await response.json();

      if (!data.success) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 302,
            message: "Mijoz ma'lumotlari topilmadi",
          },
        });
      }

      // get price per star
      let totalPrice = 0;
      let pricing = await Pricing.findOne({});
      let starPrice = pricing ? pricing.starPrice : 0;
      totalPrice = star ? star * starPrice : 0;
      if (month) {
        let premiumOption = pricing
          ? pricing.premium.find((p) => p.months === +month)
          : null;
        if (premiumOption) totalPrice += premiumOption.price;
      }

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          status: "0",
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          fields: {
            name: data.name,
            price: totalPrice * 100,
          },
        },
      });
    } catch (err) {
      console.error("Paynet check error:", err);
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }

  async performTransaction(req, res) {
    try {
      let { id, params } = req.body;

      let { transactionId, amount } = params;
      let { username, star, month } = params.fields;

      if (!transactionId || !amount || !username || (!star && !month)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      // 1. TransactionId bazada borligini tekshirish (Double payment oldini olish)
      const existingOrder = await Order.findOne({ transId: transactionId });
      if (existingOrder) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 201,
            message: "Транзакция уже существует",
          },
        });
      }

      // get price
      let totalPrice = 0;
      let pricing = await Pricing.findOne({});
      let starPrice = pricing ? pricing.starPrice : 0;
      totalPrice = star ? star * starPrice : 0;
      if (month) {
        let premiumOption = pricing
          ? pricing.premium.find((p) => p.months === +month)
          : null;
        if (premiumOption) totalPrice += premiumOption.price;
      }

      if (totalPrice * 100 !== amount) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 413, message: "Noto'g'ri summa" },
        });
      }

      let result = null;

      if (star) {
        result = await buyStars(username, star, transactionId);
      } else if (month) {
        result = await buyPremium(username, month, transactionId);
      }

      if (!result?.success) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 102,
            message: "Transakziya bekor qilindi",
          },
        });
      }

      if (result?.success) {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            timestamp: dayjs()
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
            providerTrnId: result.order._id,
            fields: {
              message: "To‘lov muvaffaqiyatli amalga oshirildi",
            },
          },
        });
      }
    } catch (err) {
      console.error("Paynet perform error:", err);
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }

  async checkTransaction(req, res) {
    try {
      let { id, params } = req.body;
      let { transactionId } = params;

      if (!transactionId) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      const existingOrder = await Order.findOne({ transId: transactionId });

      if (!existingOrder) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 203,
            message: "Транзакция не найдена",
          },
        });
      }

      if (existingOrder?.status !== "success") {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 202, message: "tranzaksiya bekor qilingan" },
        });
      }

      if (existingOrder?.status === "success") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            transactionState: 1,
            timestamp: dayjs(existingOrder.updatedAt)
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
            providerTrnId: existingOrder._id,
          },
        });
      }
    } catch (err) {
      console.error("Paynet check error:", err);
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }

  async getStatement(req, res) {
    try {
      let { id, params } = req.body;
      let { dateFrom, dateTo } = params;

      if (!dateFrom || !dateTo) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      const transactions = await Order.find({
        status: "success",
        createdAt: {
          $gte: new Date(dateFrom),
          $lte: new Date(dateTo),
        },
      });

      // get price per star
      let pricing = await Pricing.findOne({});
      let starPrice = pricing ? pricing.starPrice : 0;

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          statements: transactions.map((item) => ({
            transactionId: item.transactionId,
            amount:
              (item.productType === "stars"
                ? starPrice * +item.amount
                : pricing.premium.find((p) => p.months === +item.amount)
                    .price) * 100,
            providerTrnId: item._id,
            timestamp: dayjs(item.updatedAt)
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
          })),
        },
      });
    } catch (err) {
      console.error("Paynet getStatement error:", err);
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }
}

export default new PaynetController();
