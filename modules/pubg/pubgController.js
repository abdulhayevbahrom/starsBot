import bot from "../../bot/botConfig.js";
import PUBG from "../../models/pubg.js";

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

// data faqat chekda va statisda

class MLBBController {
  async check(req, res) {
    try {
      let { serviceId, params } = req.body;
      let { player_id, player_name, amount } = params;

      if (!amount || !player_id || !player_name) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      let exact_price = uc_s.find((item) => item.uc === "" + amount);

      if (!exact_price) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
        });
      }

      let price = exact_price.price;

      return res.json({
        serviceId: serviceId,
        timestamp: Date.now(),
        status: "OK",
        data: {
          player_name: { value: player_name },
          player_id: { value: player_id },
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
      let { player_id, player_name, amount } = params;

      if (!amount || !player_id || !player_name || !price_amount) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      // checl exact  transaction
      let transaction = await PUBG.findOne({ transId: transId });

      if (transaction) {
        return res.json({
          serviceId,
          transId: transId,
          transTime: new Date(),
          status: "FAILED",
          errorCode: "10008",
        });
      }

      let exact_uc = uc_s.find((item) => item.uc === "" + amount);

      if (!exact_uc) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10007",
        });
      }

      if (price_amount !== exact_uc.price * 100) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10011",
        });
      }

      let order = await PUBG.create({
        player_id,
        player_name,
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
        `🆔 Player ID: <code>${player_id}</code>`,
        `👤 Player Name : <code>${player_name}</code>`,
        `🪙 Miqdori: <b>${amount}</b> UC`,
        `📅 Sana: <i>${order.createdAt.toLocaleString()}</i>`,
      ].join("\n");

      await bot.sendMessage(process.env.TG_GROUP_ID_PUBG, message, {
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

      let order = await PUBG.findOne({ transId: transId });

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

      let order = await PUBG.findOne({ transId: transId });

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
            player_id: {
              value: order.player_id,
            },
            player_id: {
              value: order.player_id,
            },
            amount: {
              value: order.price_amount + "",
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
