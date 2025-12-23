import fetch from "node-fetch";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Pricing from "../../models/priceModel.js";
import { buyStars, buyPremium } from "./fragment.service.js";
import { Order } from "../../models/order.js";

dayjs.extend(utc);
dayjs.extend(timezone);

class UzumController {
  async check(req, res) {
    try {
      let { serviceId, params } = req.body;
      let { username, star, month } = params;

      if (!username || (!star && !month)) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      if (star && (star < 50 || star > 10000)) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
        });
      }

      if (month && ![3, 6, 12].includes(+month)) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
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
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
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
        serviceId: serviceId,
        timestamp: Date.now(),
        status: "OK",
        data: {
          name: {
            value: data.name,
          },
          amount: {
            value: totalPrice + "",
          },
        },
      });
    } catch (err) {
      console.error("Uzum check error:", err);
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: "99999",
      });
    }
  }

  async create(req, res) {
    try {
      let { serviceId, amount, transId: transactionId } = req.body;

      let params = req.body?.params || {};
      let { username, star, month } = params;

      if (!transactionId) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10014",
        });
      }

      // 1. TransactionId bazada borligini tekshirish (Double payment oldini olish)
      const existingOrder = await Order.findOne({ transId: transactionId });
      if (existingOrder) {
        return res.json({
          serviceId,
          transId: transactionId,
          transTime: new Date(),
          status: "FAILED",
          errorCode: "10008",
        });
      }

      if (!username || (!star && !month) || !transactionId || !amount) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
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

      if (totalPrice * 100 > amount) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10013",
        });
      }

      if (totalPrice * 100 < amount) {
        return res.json({
          serviceId: serviceId,
          transId: transactionId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10012",
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
          serviceId: serviceId,
          timestamp: new Date(),
          status: "FAILED",
          errorCode: "10009",
        });
      }

      if (result?.success) {
        return res.json({
          serviceId: serviceId,
          transId: transactionId,
          status: "CREATED",
          transTime: result?.order?.updatedAt
            ? new Date(result?.order?.updatedAt).getTime()
            : Date.now().getTime(),
          data: {},
        });
      }
    } catch (err) {
      console.error("Uzum create error:", err);
      // 4. Xatolik turiga qarab errorCode qaytarish
      let errorCode = "99999"; // Default: Ichki xatolik

      if (
        err.message.includes("Balans yetarli emas") ||
        err.message.includes("balansida yetarli TON yo'q") ||
        err.response?.status === 402
      ) {
        errorCode = "10009"; // To'lovda xatolik (Fragment balansi yo'q)
      } else if (
        err.message.includes("not found") ||
        err.response?.status === 404
      ) {
        errorCode = "10009"; // Foydalanuvchi topilmadi
      }

      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: errorCode,
      });
    }
  }

  async confirm(req, res) {
    try {
      let { transId, serviceId } = req.body;

      if (!transId) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      const existingOrder = await Order.findOne({ transId: transId });

      if (!existingOrder) {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: existingOrder?.updatedAt
            ? new Date(existingOrder?.updatedAt).getTime()
            : new Date().getTime(),
          errorCode: "10014",
        });
      }

      if (!existingOrder?.status !== "success") {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: null,
          errorCode: "10015",
        });
      }

      if (existingOrder?.status === "success") {
        return res.json({
          serviceId,
          transId,
          status: "CONFIRMED",
          confirmTime: existingOrder?.updatedAt
            ? new Date(existingOrder?.updatedAt).getTime()
            : new Date().getTime(),
          data: {},
        });
      }
    } catch (err) {
      console.error("Uzum confirm error:", err);
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: "99999",
      });
    }
  }

  async reverse(req, res) {
    try {
      let { transId, serviceId } = req.body;

      if (!transId) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10014",
        });
      }

      const existingOrder = await Order.findOne({ transId: transId });

      if (!existingOrder) {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          reverseTime: existingOrder?.updatedAt
            ? new Date(existingOrder.updatedAt).getTime()
            : new Date().getTime(),
          errorCode: "10014",
        });
      }

      // update
      let order = await Order.findOneAndUpdate(
        { transId: transId },
        { status: "reversed" },
        { new: true }
      );

      if (!order) {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          reverseTime: new Date().getTime(),
          errorCode: "10017",
        });
      }

      return res.json({
        serviceId,
        transId,
        status: "REVERSED",
        reverseTime: order?.updatedAt
          ? new Date(order.updatedAt).getTime()
          : new Date().getTime(),
        data: {
          message: "Transaction reversed successfully",
        },
        amount: order?.amount || 0 * 100,
      });
    } catch (err) {
      console.error("Uzum reverse error:", err);
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: "99999",
      });
    }
  }

  async status(req, res) {
    try {
      let { transId, serviceId } = req.body;

      if (!transId) {
        return res.json({
          serviceId: serviceId,
          timestamp: new Date().getTime(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      const existingOrder = await Order.findOne({ transId: transId });

      if (!existingOrder) {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          errorCode: "10014",
        });
      }

      if (existingOrder?.status !== "success") {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          transTime: existingOrder?.updatedAt
            ? new Date(existingOrder.updatedAt).getTime()
            : new Date().getTime(),
          confirmTime: null,
          reverseTime: null,
          errorCode: "10014",
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

      if (existingOrder.status === "success") {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "CONFIRMED",
          transTime: existingOrder.createdAt,
          confirmTime: existingOrder.updatedAt,
          reverseTime: null,
          data: {
            name: {
              value: data.name,
            },
            amount: {
              value: existingOrder.amount + "",
            },
          },
          amount: existingOrder.amount * 100, // tiyinda
        });
      }
    } catch (err) {
      console.error("Uzum status error:", err);
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: "99999",
      });
    }
  }
}

export default new UzumController();
