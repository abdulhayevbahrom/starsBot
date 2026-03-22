import bot from "../../bot/botConfig.js";
import MLBB from "../../models/mlbb.js";
import axios from "axios";
import dayjs from "dayjs";

let diamonds = [
  {
    diamonds: "55",
    price: 15000,
  },
  {
    diamonds: "86",
    price: 20000,
  },
  {
    diamonds: "172",
    price: 38000,
  },
  {
    diamonds: "275",
    price: 64000,
  },
  {
    diamonds: "706",
    price: 155000,
  },
  {
    diamonds: "2195",
    price: 460000,
  },
  {
    diamonds: "3688",
    price: 7300000,
  },
  {
    diamonds: "5532",
    price: 1020000,
  },
  {
    diamonds: "9228",
    price: 17600000,
  },
  {
    diamonds: "weekly",
    price: 30000,
  },
];

class MLBBController {
  async getInformation(req, res) {
    try {
      let { id, params } = req.body;
      let { user_id, zone_id, quantity } = params.fields;

      if (!quantity || !user_id || !zone_id) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      if (String(zone_id).startsWith("6")) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 100, message: "zone id 6 bilan boshlanmasin" },
        });
      }

      let exact_price = diamonds.find(
        (item) => item.diamonds === "" + quantity,
      );

      if (!exact_price) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 304,
            message: "diamond miqdori noto‘g‘ri",
          },
        });
      }

      let price = exact_price.price;

      let URL = "https://www.smile.one/merchant/mobilelegends/checkrole";

      const { data } = await axios.post(URL, {
        user_id,
        zone_id,
      });

      // Agar mijoz mavjud bo‘lmasa (hozircha false)
      if (data.code === 201) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 302,
            message: "Mijoz ma'lumotlari topilmadi",
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
            name: data.username,
            amount: price,
          },
        },
      });
    } catch (error) {
      console.log("paynet mlbb check error", error);
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi", error },
      });
    }
  }

  async performTransaction(req, res) {
    try {
      let { id } = req.body;
      let params = req.body.params;
      let transactionId = params.transactionId;
      let amount = Number(params.amount);
      let { user_id, zone_id, quantity } = params.fields;

      if (!quantity || !user_id || !zone_id || !amount || !transactionId) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      // check exact  transaction
      let transaction = await MLBB.findOne({ transId: transactionId });

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

      if (String(zone_id).startsWith("6")) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 100, message: "zone id 6 bilan boshlanmasin" },
        });
      }

      let exact_diamond = diamonds.find(
        (item) => item.diamonds === "" + quantity,
      );

      if (!exact_diamond) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: 304,
            message: "diamond miqdori noto‘g‘ri",
          },
        });
      }

      if (Number.isNaN(amount) || amount !== exact_diamond.price * 100) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 413, message: "Narx noto‘g‘ri" },
        });
      }

      let order = await MLBB.create({
        user_id,
        zone_id,
        amount: String(quantity),
        price_amount: amount / 100,
        status: "success",
        transId: transactionId,
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
        `🆔 MLBB ID: <code>${user_id}</code>`,
        `🌐 Zone ID: <code>${zone_id}</code>`,
        `💎 Miqdori: <b>${quantity}</b> diamonds`,
        `📅 Sana: <i>${order.createdAt.toLocaleString()}</i>`,
      ].join("\n");

      await bot.sendMessage(process.env.TG_GROUP_ID_MLBB, message, {
        parse_mode: "HTML",
      });

      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          providerTrnId: order._id,
          fields: {
            price: exact_diamond.price * 100,
            message: "To‘lov muvaffaqiyatli amalga oshirildi",
          },
        },
      });
    } catch (error) {
      console.log("paynet mlbb create error", error);
      return res.json({
        jsonrpc: "2.0",
        id: req.body.id || null,
        error: { code: -32603, message: "Tizim xatosi", error },
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

      let order = await MLBB.findOne({ transId: transactionId });

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
      console.error("Paynet mlbb check error:", error);
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
      // check id and serviceId
      if (!id || !serviceId) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      if (!dateFrom || !dateTo) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Majburiy parametr yo‘q" },
        });
      }

      if (![3].includes(serviceId)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 305, message: "Invalid service id" },
        });
      }

      let order = await MLBB.find({
        status: "success",
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
      console.error("Paynet mlbb getStatement error:", error);
      return res.json({
        jsonrpc: "2.0",
        id: req.body.id || null,
        error: { code: -32603, message: "Tizim xatosi", error },
      });
    }
  }
}

export default new MLBBController();
