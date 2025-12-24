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

// data faqat chekda va statisda

class MLBBController {
  async check(req, res) {
    try {
      let { serviceId, params } = req.body;
      let { user_id, zone_id, amount } = params;

      if (!amount || !user_id || !zone_id) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }
      // agar bolsa notogri bolsa 10007
      // agar bolmasa 10005
      if (String(zone_id).startsWith("6")) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
        });
      }

      let exact_price = diamonds.find((item) => item.diamonds === "" + amount);

      if (!exact_price) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
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
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
        });
      }

      return res.json({
        serviceId: serviceId,
        timestamp: Date.now(),
        status: "OK",
        data: {
          name: { value: data.username },
          amount: { value: price + "" },
        },
      });
    } catch (error) {
      console.log("uzum mlbb check error", error);
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
      let { serviceId, transId, price_amount } = req.body;
      let params = req.body.params;
      let { user_id, zone_id, amount } = params;

      if (!amount || !user_id || !zone_id || !price_amount) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      // checl exact  transaction
      let transaction = await MLBB.findOne({ transId: transId });

      if (transaction) {
        return res.json({
          serviceId,
          transId: transId,
          transTime: new Date(),
          status: "FAILED",
          errorCode: "10008",
        });
      }

      if (String(zone_id).startsWith("6")) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
        });
      }

      let exact_diamond = diamonds.find(
        (item) => item.diamonds === "" + amount
      );

      if (!exact_diamond) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
        });
      }

      if (price_amount !== exact_diamond.price * 100) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10011",
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
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10009",
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
        serviceId: serviceId,
        transId: transId,
        status: "CREATED",
        transTime: order?.createdAt
          ? new Date(order.createdAt).getTime()
          : new Date().getTime(),
        data: {},
        amount: price_amount,
      });
    } catch (error) {
      console.log("uzum mlbb create error", error);
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: new Date().getTime(),
        status: "FAILED",
        errorCode: "99999",
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
          confirmTime: null,
          errorCode: "10015",
        });
      }

      return res.json({
        serviceId,
        transId,
        confirmTime: order?.updatedAt
          ? new Date(order.updatedAt).getTime()
          : new Date().getTime(),
        status: "CONFIRMED",
        data: {},
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

      if (order.status === "reversed") {
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

      let URL = "https://www.smile.one/merchant/mobilelegends/checkrole";

      const { data } = await axios.post(URL, {
        user_id: order.user_id,
        zone_id: order.zone_id,
      });

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
            name: {
              value: data.username,
            },
            amount: {
              value: order.price_amount + "",
            },
            user_id: {
              value: order.user_id,
            },
            zone_id: {
              value: order.zone_id,
            },
          },
          amount: order.price_amount * 100,
        });
      }

      return res.json({
        serviceId: serviceId,
        transId: transId,
        status: "FAILED",
        transTime: order?.createdAt
          ? new Date(order.createdAt).getTime()
          : new Date().getTime(),
        confirmTime: null,
        reverseTime: null,
        errorCode: "10014",
      });
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
