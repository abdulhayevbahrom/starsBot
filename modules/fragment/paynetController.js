import fetch from "node-fetch";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Pricing from "../../models/priceModel.js";
import { buyStars, buyPremium, checkModule } from "./fragment.service.js";
import { Order } from "../../models/order.js";
import { botTg as bot } from "../../bot/botConfig.js";

dayjs.extend(utc);
dayjs.extend(timezone);

class PaynetController {
  async getInformation(req, res) {
    try {
      let { id, params } = req.body;
      let { serviceId } = params;
      let { username, star, month } = params.fields;

      if (![1, 2].includes(serviceId)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 305, message: "Invalid service id" },
        });
      }

      // Username majburiy
      if (!username) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Username majburiy" },
        });
      }

      // ===== SERVICE LOGIC =====
      if (serviceId == 1) {
        // ⭐ STAR SERVICE
        if (!star) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Star kiritilishi shart" },
          });
        }

        if (star < 50 || star > 10000) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: 301,
              message:
                "Yulduzlar soni 50 dan kam va 10000 dan ko‘p bo‘lmasligi kerak",
            },
          });
        }
      }

      if (serviceId == 2) {
        // 👑 PREMIUM SERVICE
        if (!month) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Premium oylari kiritilmadi" },
          });
        }

        if (![3, 6, 12].includes(+month)) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: 301,
              message: "Premium 3, 6 yoki 12 oy bo‘lishi kerak",
            },
          });
        }
      }

      // ==========================

      const url = `${process.env.API_BASE}/star/recipient/search?username=${username}&quantity=50`;
      const response = await fetch(url, {
        headers: {
          "API-Key": process.env.API_KEY,
        },
      });

      const data = await response.json();

      if (!data.success) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 302,
            message: "Mijoz topilmadi",
          },
        });
      }

      // ===== PRICE CALCULATION =====
      let totalPrice = 0;
      const pricing = await Pricing.findOne({});

      if (serviceId == 1) {
        const starPrice = pricing?.starPrice || 0;
        totalPrice = star * starPrice;
      }

      if (serviceId == 2) {
        const premium = pricing?.premium.find((p) => p.months === +month);
        if (premium) totalPrice = premium.price;
      }

      let type = serviceId == 1 ? "stars" : "premium";
      try {
        await checkModule(type, serviceId == 1 ? star : month);
      } catch (err) {
        try {
          await bot.sendMessage(
            process.env.ADMIN_IDS.split(",")[0],
            `❌ Hisobda ton yetarli emas [Payent] ❌`
          );
        } catch (err) {
          console.error("Failed to send bot notification:", err);
        }

        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 501,
            message: "To'lov bekor qilindi, keyinroq qayta urinib ko'ring",
          },
        });
      }

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          status: "0",
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          fields: {
            name: data.name,
            amount: totalPrice,
          },
        },
      });
    } catch (err) {
      console.error("Paynet check error:", err);
      return res.json({
        jsonrpc: "2.0",
        id: req.body.id || null,
        error: {
          code: -32603,
          message: "Tizim xatosi",
        },
      });
    }
  }

  // async performTransaction(req, res) {
  //   try {
  //     let { id, params } = req.body;

  //     let { transactionId, amount, serviceId } = params;
  //     let { username, star, month } = params.fields;

  //     if (!transactionId || !amount || !username || (!star && !month)) {
  //       return res.json({
  //         jsonrpc: "2.0",
  //         id,
  //         error: { code: -32602, message: "Majburiy parametr yo‘q" },
  //       });
  //     }

  //     // 1. TransactionId bazada borligini tekshirish (Double payment oldini olish)
  //     const existingOrder = await Order.findOne({ transId: transactionId });
  //     if (existingOrder) {
  //       return res.json({
  //         jsonrpc: "2.0",
  //         id,
  //         error: {
  //           code: 201,
  //           message: "Транзакция уже существует",
  //         },
  //       });
  //     }

  //     // get price
  //     let totalPrice = 0;
  //     let pricing = await Pricing.findOne({});
  //     let starPrice = pricing ? pricing.starPrice : 0;
  //     totalPrice = star ? star * starPrice : 0;
  //     if (month) {
  //       let premiumOption = pricing
  //         ? pricing.premium.find((p) => p.months === +month)
  //         : null;
  //       if (premiumOption) totalPrice += premiumOption.price;
  //     }

  //     if (totalPrice * 100 !== amount) {
  //       return res.json({
  //         jsonrpc: "2.0",
  //         id,
  //         error: { code: 413, message: "Noto'g'ri summa" },
  //       });
  //     }

  //     let result = null;

  //     if (star) {
  //       result = await buyStars(username, star, transactionId);
  //     } else if (month) {
  //       result = await buyPremium(username, month, transactionId);
  //     }

  //     if (!result?.success) {
  //       return res.json({
  //         jsonrpc: "2.0",
  //         id,
  //         error: {
  //           code: 102,
  //           message: "Transakziya bekor qilindi",
  //         },
  //       });
  //     }

  //     if (result?.success) {
  //       return res.json({
  //         jsonrpc: "2.0",
  //         id,
  //         result: {
  //           timestamp: dayjs()
  //             .tz("Asia/Tashkent")
  //             .format("YYYY-MM-DD HH:mm:ss"),
  //           providerTrnId: result.order._id,
  //           fields: {
  //             message: "To‘lov muvaffaqiyatli amalga oshirildi",
  //           },
  //         },
  //       });
  //     }
  //   } catch (err) {
  //     console.error("Paynet perform error:", err);
  //     return res.json({
  //       jsonrpc: "2.0",
  //       id: id || null,
  //       error: { code: -32603, message: "Tizim xatosi", err },
  //     });
  //   }
  // }

  async performTransaction(req, res) {
    try {
      let { id, params } = req.body;
      let { transactionId, amount, serviceId } = params;
      let { username, star, month } = params.fields;

      // ===== BASIC VALIDATION =====
      if (!transactionId || !amount || !username || !serviceId) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      // ===== SERVICE VALIDATION =====
      if (serviceId == 1) {
        if (!star) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Star kiritilishi shart" },
          });
        }
      }

      if (serviceId == 2) {
        if (!month) {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Premium oyi kiritilmadi" },
          });
        }
      }

      // ===== DOUBLE PAYMENT CHECK =====
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

      // ===== PRICE CALCULATION =====
      let totalPrice = 0;
      const pricing = await Pricing.findOne({});

      if (serviceId == 1) {
        const starPrice = pricing?.starPrice || 0;
        totalPrice = star * starPrice;
      }

      if (serviceId == 2) {
        const premium = pricing?.premium.find((p) => p.months === +month);
        if (premium) totalPrice = premium.price;
      }

      if (totalPrice * 100 !== amount) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 413, message: "Noto'g'ri summa" },
        });
      }

      // ===== PERFORM TRANSACTION =====
      let result = null;

      if (serviceId == 1) {
        result = await buyStars(username, star, transactionId);
      }

      if (serviceId == 2) {
        result = await buyPremium(username, month, transactionId);
      }

      if (!result?.success) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 102,
            message: "Transaksiya bekor qilindi",
          },
        });
      }

      // ===== SUCCESS =====
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          providerTrnId: result.order._id,
          fields: {
            message: "To‘lov muvaffaqiyatli amalga oshirildi",
          },
        },
      });
    } catch (err) {
      console.error("Paynet perform error:", err);
      return res.json({
        jsonrpc: "2.0",
        id: req.body.id || null,
        error: { code: -32603, message: "Tizim xatosi" },
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
              .format("ddd MMM DD HH:mm:ss [UZT] YYYY"),
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

  // async getStatement(req, res) {
  //   try {
  //     let { id, params } = req.body;
  //     let { dateFrom, dateTo } = params;

  //     if (!dateFrom || !dateTo) {
  //       return res.json({
  //         jsonrpc: "2.0",
  //         id,
  //         error: { code: -32602, message: "Majburiy parametr yo‘q" },
  //       });
  //     }

  //     const transactions = await Order.find({
  //       status: "success",
  //       createdAt: {
  //         $gte: new Date(dateFrom),
  //         $lte: new Date(dateTo),
  //       },
  //     });

  //     // get price per star
  //     let pricing = await Pricing.findOne({});
  //     let starPrice = pricing ? pricing.starPrice : 0;

  //     return res.json({
  //       jsonrpc: "2.0",
  //       id,
  //       result: {
  //         statements: transactions.map((item) => ({
  //           transactionId: item.transactionId,
  //           amount:
  //             (item.productType === "stars"
  //               ? starPrice * +item.amount
  //               : pricing.premium.find((p) => p.months === +item.amount)
  //                   .price) * 100,
  //           providerTrnId: item._id,
  //           timestamp: dayjs(item.updatedAt)
  //             .tz("Asia/Tashkent")
  //             .format("YYYY-MM-DD HH:mm:ss"),
  //         })),
  //       },
  //     });
  //   } catch (err) {
  //     console.error("Paynet getStatement error:", err);
  //     return res.json({
  //       jsonrpc: "2.0",
  //       id: id || null,
  //       error: { code: -32603, message: "Tizim xatosi", err },
  //     });
  //   }
  // }

  async getStatement(req, res) {
    try {
      let { id, params } = req.body;
      let { dateFrom, dateTo, serviceId } = params;

      if (!dateFrom || !dateTo) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      if (![1, 2].includes(serviceId)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 305, message: "Invalid service id" },
        });
      }

      // ===== SERVICE TYPE MAPPING =====
      let productType = null;
      if (serviceId == 1) productType = "stars";
      if (serviceId == 2) productType = "premium";

      // ===== QUERY =====
      const query = {
        status: "success",
        createdAt: {
          $gte: new Date(dateFrom),
          $lte: new Date(dateTo),
        },
      };

      if (productType) {
        query.productType = productType;
      }

      const transactions = await Order.find(query);

      const pricing = await Pricing.findOne({});
      const starPrice = pricing?.starPrice || 0;

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          statements: transactions.map((item) => {
            let amount = 0;

            if (item.productType === "stars") {
              amount = starPrice * +item.amount;
            }

            if (item.productType === "premium") {
              const premium = pricing.premium.find(
                (p) => p.months === +item.amount
              );
              amount = premium?.price || 0;
            }

            return {
              transactionId: item.transactionId,
              amount: amount * 100, // tiyinga o‘tkazish
              providerTrnId: item._id,
              timestamp: dayjs(item.updatedAt)
                .tz("Asia/Tashkent")
                .format("YYYY-MM-DD HH:mm:ss"),
            };
          }),
        },
      });
    } catch (err) {
      console.error("Paynet getStatement error:", err);
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi" },
      });
    }
  }
}

export default new PaynetController();
