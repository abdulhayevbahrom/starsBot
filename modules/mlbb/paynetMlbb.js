import bot from "../../bot/botConfig.js";
import MLBB from "../../models/mlbb.js";
import axios from "axios";

let diamonds = [
  {
    diamonds: "55",
    price: 13000,
  },
  {
    diamonds: "86",
    price: 18500,
  },
  {
    diamonds: "172",
    price: 35000,
  },
  {
    diamonds: "275",
    price: 55000,
  },
  {
    diamonds: "706",
    price: 133000,
  },
  {
    diamonds: "2195",
    price: 408000,
  },
  {
    diamonds: "3688",
    price: 680000,
  },
  {
    diamonds: "5532",
    price: 1007000,
  },
  {
    diamonds: "9228",
    price: 1650000,
  },
  {
    diamonds: "weekly",
    price: 25000,
  },
];

class MLBBController {
  async getInformation(req, res) {
    try {
      let { id, params } = req.body;
      let { user_id, zone_id, amount } = params.fields;

      if (!amount || !user_id || !zone_id) {
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

      let exact_price = diamonds.find((item) => item.diamonds === "" + amount);

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
            price: price * 100,
          },
        },
      });
    } catch (error) {
      console.log("paynet mlbb check error", error);
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
      let { user_id, zone_id, amount, price_amount, transactionId } =
        params.fields;

      if (!amount || !user_id || !zone_id || !price_amount || !transactionId) {
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
        (item) => item.diamonds === "" + amount
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

      if (price_amount !== exact_diamond.price * 100) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 413, message: "Narx noto‘g‘ri" },
        });
      }

      let order = await MLBB.create({
        user_id,
        zone_id,
        amount,
        price_amount: price_amount / 100,
        status: "success",
        transId: transId,
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
        `💎 Miqdori: <b>${amount}</b> diamonds`,
        `📅 Sana: <i>${order.createdAt.toLocaleString()}</i>`,
      ].join("\n");

      await bot.sendMessage(process.env.TG_GROUP_ID, message, {
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
        id: id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }

  async confirm(req, res) {
    try {
      let { serviceId, transId } = req.body;

      if (!transId) {
        return res.json({
          serviceId: serviceId,
          timestamp: new Date().getTime(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      let order = await MLBB.findOne({ transId: transId });

      if (!order) {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: order?.updatedAt
            ? new Date(order.updatedAt).getTime()
            : new Date().getTime(),
          errorCode: "10014",
        });
      }

      if (order.status !== "success") {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          confirmTime: order.updatedAt || null,
          errorCode: "10015",
        });
      }

      return res.json({
        serviceId,
        transId,
        confirmTime: order.updatedAt,
        data: {
          message: "Xarid muvaffaqiyatli amalga oshirildi",
        },
        amount: order.price_amount * 100,
      });
    } catch (error) {
      console.log("uzum mlbb confirm error", error);
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
      let { serviceId, transId } = req.body;

      if (!transId) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      let order = await MLBB.findOne({ transId: transId });

      if (!order) {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          errorCode: "10014",
        });
      }

      let reversedOrder = await MLBB.findOneAndUpdate(
        { transId: transId },
        { status: "reversed" },
        { new: true }
      );

      if (!reversedOrder) {
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
        reverseTime: reversedOrder?.updatedAt
          ? new Date(reversedOrder.updatedAt).getTime()
          : new Date(),
        data: {
          message: "Transaction bekor qilindi",
        },
        amount: reversedOrder.price_amount * 100,
      });
    } catch (error) {
      console.log("uzum mlbb reverse error", error);
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
      let { serviceId, transId } = req.body;

      if (!transId) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      let order = await MLBB.findOne({ transId: transId });

      if (!order) {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "FAILED",
          errorCode: "10014",
        });
      }

      if (order.status !== "success") {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "REVERSED",
          transTime: order?.createdAt
            ? new Date(order.createdAt).getTime()
            : new Date().getTime(),
          confirmTime: order?.updatedAt
            ? new Date(order.updatedAt).getTime()
            : new Date().getTime(),
          reverseTime: order?.updatedAt
            ? new Date(order.updatedAt).getTime()
            : new Date().getTime(),
          errorCode: "10014",
        });
      }

      if (order.status === "success") {
        return res.json({
          serviceId: serviceId,
          transId: transId,
          status: "CONFIRMED",
          transTime: order?.createdAt
            ? new Date(order.createdAt).getTime()
            : new Date().getTime(),
          confirmTime: order?.updatedAt
            ? new Date(order.updatedAt).getTime()
            : new Date().getTime(),
          reverseTime: null,
          data: {
            message: "Xarid muvaffaqiyatli amalga oshirildi",
          },
          amount: order.price_amount * 100,
        });
      }
    } catch (error) {
      console.log("uzum mlbb status error", error);
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: "99999",
      });
    }
  }
}

export default new MLBBController();
