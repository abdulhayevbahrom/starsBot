import bot from "../../bot/botConfig.js";
import PUBG from "../../models/pubg.js";
import dayjs from "dayjs";

let uc_s = [
  {
    uc: "60",
    price: 13000,
  },
  {
    uc: "325",
    price: 60000,
  },
  {
    uc: "660",
    price: 120000,
  },
  {
    uc: "1800",
    price: 310000,
  },
  {
    uc: "3850",
    price: 5850000,
  },
  {
    uc: "8100",
    price: 1180000,
  },
];

class PubgPaynetController {
  async getInformation(req, res) {
    try {
      let { id, params } = req.body;
      let { player_id, quantity } = params.fields;

      if (!quantity || !player_id) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      if (!String(player_id).startsWith("5")) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 100, message: "player id 5 bilan boshlansin" },
        });
      }

      let exact_price = uc_s.find((item) => item.uc === "" + quantity);

      if (!exact_price) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 100,
            message: "Miqdor noto‘g‘ri",
          },
        });
      }

      let price = exact_price.price;

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          status: "0",
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          fields: {
            player_id,
            amount: price,
          },
        },
      });
    } catch (err) {
      console.log("paynet pubg get error", err);
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }

  async performTransaction(req, res) {
    try {
      let { id } = req.body;
      let params = req.body.params;
      let transactionId = params.transactionId;
      let amount = params.amount;
      let { player_id, quantity, price_amount } = params.fields;

      if (
        !amount ||
        !player_id ||
        !quantity ||
        !price_amount ||
        !transactionId
      ) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      let transaction = await PUBG.findOne({ transId: transactionId });

      if (transaction) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 201,
            message: "Транзакция уже существует",
          },
        });
      }

      if (!String(player_id).startsWith("5")) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 100, message: "player id 5 bilan boshlansin" },
        });
      }

      let exact_price = uc_s.find((item) => item.uc === "" + quantity);

      if (!exact_price) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 304,
            message: "UC Miqdor noto‘g‘ri",
          },
        });
      }

      if (amount !== exact_price.price * 100) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 413, message: "Narx noto‘g‘ri" },
        });
      }

      let order = await PUBG.create({
        player_id,
        amount,
        price_amount: amount / 100,
        status: "success",
        transId: transactionId,
        from: "paynet",
      });

      if (!order) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 102,
            message: "Transakziya bekor qilindi",
          },
        });
      }

      const message = [
        `🆔 Player ID: <code>${player_id}</code>`,
        `🪙 Miqdori: <b>${quantity}</b> UC`,
        `💰 From: <b>Paynet</b>`,
        `📅 Sana: <i>${order.createdAt.toLocaleString()}</i>`,
      ].join("\n");

      await bot.sendMessage(process.env.TG_GROUP_ID_PUBG, message, {
        parse_mode: "HTML",
      });

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          providerTrnId: order._id,
          fields: {
            price: exact_price.price * 100,
            message: "To‘lov muvaffaqiyatli amalga oshirildi",
          },
        },
      });
    } catch (err) {
      console.log("paynet pubg perform error", err);
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
      let transactionId = params.transactionId;

      if (!transactionId) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      let order = await PUBG.findOne({ transId: transactionId });

      if (!order) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 203,
            message: "Транзакция не найдена",
          },
        });
      }

      if (order.status !== "success") {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 202, message: "tranzaksiya bekor qilingan" },
        });
      }

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          transactionState: 1,
          timestamp: dayjs(order.updatedAt)
            .tz("Asia/Tashkent")
            .format("ddd MMM DD HH:mm:ss [UZT] YYYY"),
          providerTrnId: order._id,
        },
      });
    } catch (error) {
      console.error("Paynet pubg check error:", error);
      return res.json({
        jsonrpc: "2.0",
        id: req.body.id || null,
        error: { code: -32603, message: "Tizim xatosi", error },
      });
    }
  }

  async getStatement(req, res) {
    try {
      let { id, params } = req.body;
      let { dateFrom, dateTo } = params;
      let { serviceId } = params;

      if (!dateFrom || !dateTo) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      if (![4].includes(serviceId)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 305, message: "Invalid service id" },
        });
      }

      let order = await PUBG.find({
        status: "success",
        from: "paynet",
        createdAt: {
          $gte: new Date(dateFrom),
          $lte: new Date(dateTo),
        },
      });

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          statements: order.map((item) => ({
            transactionId: item.transId,
            amount: item.price_amount * 100,
            providerTrnId: item._id,
            timestamp: dayjs(item.updatedAt)
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
          })),
        },
      });
    } catch (error) {
      console.error("Paynet pubg getStatement error:", error);
      return res.json({
        jsonrpc: "2.0",
        id: req.body.id || null,
        error: { code: -32603, message: "Tizim xatosi", error },
      });
    }
  }
}

export default new PubgPaynetController();
