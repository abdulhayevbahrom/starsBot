import PUBG from "../../models/pubg.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { sendPubgOrderToAdmins } from "../../bot/pubgAdmin.js";
import { checkPubgPlayer } from "./volsever.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const PUBG_SERVICE_ID = 4;
const PLAYER_CACHE_TTL_MS = 30 * 60 * 1000;
const PLAYER_CACHE_MAX_SIZE = 100;
const playerCache = new Map();

const PAYNET_ERRORS = {
  invalidRequest: { code: -32600, message: "Method ko‘rsatilmagan" },
  methodNotFound: { code: -32601, message: "Method topilmadi" },
  invalidParams: { code: -32602, message: "Majburiy parametr yo‘q" },
  internalError: { code: -32603, message: "Tizim xatosi" },
  invalidService: { code: 305, message: "Invalid service id" },
  invalidClient: { code: 302, message: "Mijoz ma’lumotlari noto‘g‘ri" },
  transactionExists: { code: 201, message: "Tranzaksiya allaqachon mavjud" },
  transactionCanceled: { code: 202, message: "Tranzaksiya bekor qilingan" },
  transactionNotFound: { code: 203, message: "Tranzaksiya topilmadi" },
  invalidQuantity: { code: 304, message: "Miqdor noto‘g‘ri" },
  invalidAmount: { code: 413, message: "Narx noto‘g‘ri" },
};

const UC_PACKAGES = new Map([
  ["60", 13000],
  ["325", 66000],
  ["660", 132000],
  ["1800", 325000],
  ["3850", 650000],
  ["8100", 1330000],
]);

function paynetError(id, error) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error,
  };
}

function paynetResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function validateServiceId(params) {
  return params?.serviceId === PUBG_SERVICE_ID;
}

function validateFields(fields = {}) {
  const playerId = String(fields.player_id ?? "").trim();
  const product = String(fields.product ?? fields.quantity ?? "").trim();

  if (!playerId || !product) {
    return { ok: false, error: PAYNET_ERRORS.invalidParams };
  }

  if (!/^5\d+$/.test(playerId)) {
    return {
      ok: false,
      error: {
        ...PAYNET_ERRORS.invalidClient,
        message: "Player ID 5 bilan boshlansin",
      },
    };
  }

  return { ok: true, playerId, product };
}

function cachePlayer(playerId, player) {
  const now = Date.now();

  if (playerCache.size >= PLAYER_CACHE_MAX_SIZE) {
    for (const [cachedPlayerId, cached] of playerCache) {
      if (cached.expiresAt <= now) {
        playerCache.delete(cachedPlayerId);
      }
    }

    if (playerCache.size >= PLAYER_CACHE_MAX_SIZE) {
      const oldestPlayerId = playerCache.keys().next().value;
      playerCache.delete(oldestPlayerId);
    }
  }

  playerCache.set(playerId, {
    username: player.username,
    resolvedPlayerId: player.userId,
    expiresAt: now + PLAYER_CACHE_TTL_MS,
  });
}

function getCachedPlayer(playerId) {
  const cached = playerCache.get(playerId);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    playerCache.delete(playerId);
    return null;
  }

  return cached;
}

class PubgPaynetController {
  dispatch(req, res) {
    const { id, jsonrpc, method, params } = req.body ?? {};

    if (jsonrpc !== "2.0" || !method || !params || typeof params !== "object") {
      return res.json(paynetError(id, PAYNET_ERRORS.invalidRequest));
    }

    const actions = {
      GetInformation: this.getInformation.bind(this),
      PerformTransaction: this.performTransaction.bind(this),
      CheckTransaction: this.checkTransaction.bind(this),
      GetStatement: this.getStatement.bind(this),
    };

    const action = actions[method];
    if (!action) {
      return res.json(paynetError(id, PAYNET_ERRORS.methodNotFound));
    }

    return action(req, res);
  }

  async getInformation(req, res) {
    const { id, params } = req.body;

    try {
      if (!validateServiceId(params)) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidService));
      }

      const validated = validateFields(params.fields);
      if (!validated.ok) {
        return res.json(paynetError(id, validated.error));
      }

      const price = UC_PACKAGES.get(validated.product);
      if (!price) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidQuantity));
      }

      const player = await checkPubgPlayer(validated.playerId);
      if (!player) {
        return res.json(
          paynetError(id, {
            ...PAYNET_ERRORS.invalidClient,
            message: "Mijoz ma’lumotlari topilmadi",
          }),
        );
      }

      cachePlayer(validated.playerId, player);

      return res.json(
        paynetResult(id, {
          status: "0",
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          fields: {
            player_id: player.userId,
            player_name: player.username,
            amount: price,
          },
        }),
      );
    } catch (error) {
      console.error("Paynet PUBG GetInformation xatoligi:", error.message);
      return res.json(paynetError(id, PAYNET_ERRORS.internalError));
    }
  }

  async performTransaction(req, res) {
    const { id, params } = req.body;

    try {
      if (!validateServiceId(params)) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidService));
      }

      const transactionId = String(params.transactionId ?? "").trim();
      const amount = Number(params.amount);

      if (!transactionId || !amount) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidParams));
      }

      const validated = validateFields(params.fields);
      if (!validated.ok) {
        return res.json(paynetError(id, validated.error));
      }

      const price = UC_PACKAGES.get(validated.product);
      if (!price) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidQuantity));
      }

      if (Number.isNaN(amount) || amount !== price * 100) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidAmount));
      }

      const existingOrder = await PUBG.findOne({ transId: transactionId });
      if (existingOrder) {
        return res.json(paynetError(id, PAYNET_ERRORS.transactionExists));
      }

      const playerProfile = getCachedPlayer(validated.playerId);

      const order = await PUBG.create({
        player_id: playerProfile?.resolvedPlayerId || validated.playerId,
        player_name: playerProfile?.username || null,
        amount: Number(validated.product),
        price_amount: price,
        status: "success",
        admin_status: "pending",
        transId: transactionId,
        from: "paynet",
      });

      playerCache.delete(validated.playerId);

      try {
        await sendPubgOrderToAdmins(order, {
          quantity: validated.product,
          source: "Paynet",
        });
      } catch (telegramError) {
        console.error(
          "PUBG buyurtmasini Telegramga yuborishda xatolik:",
          telegramError.message,
        );
      }

      return res.json(
        paynetResult(id, {
          timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
          providerTrnId: order._id,
          fields: {
            price: amount,
            message: "To‘lov muvaffaqiyatli amalga oshirildi",
          },
        }),
      );
    } catch (error) {
      if (error?.code === 11000) {
        return res.json(paynetError(id, PAYNET_ERRORS.transactionExists));
      }

      console.error("Paynet PUBG PerformTransaction xatoligi:", error);
      return res.json(paynetError(id, PAYNET_ERRORS.internalError));
    }
  }

  async checkTransaction(req, res) {
    const { id, params } = req.body;

    try {
      if (!validateServiceId(params)) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidService));
      }

      const transactionId = String(params.transactionId ?? "").trim();
      if (!transactionId) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidParams));
      }

      const order = await PUBG.findOne({
        transId: transactionId,
        from: "paynet",
      });

      if (!order) {
        return res.json(paynetError(id, PAYNET_ERRORS.transactionNotFound));
      }

      if (["failed", "reversed"].includes(order.status)) {
        return res.json(paynetError(id, PAYNET_ERRORS.transactionCanceled));
      }

      return res.json(
        paynetResult(id, {
          transactionState: 1,
          timestamp: dayjs(order.updatedAt)
            .tz("Asia/Tashkent")
            .format("ddd MMM DD HH:mm:ss [UZT] YYYY"),
          providerTrnId: order._id,
        }),
      );
    } catch (error) {
      console.error("Paynet PUBG CheckTransaction xatoligi:", error);
      return res.json(paynetError(id, PAYNET_ERRORS.internalError));
    }
  }

  async getStatement(req, res) {
    const { id, params } = req.body;

    try {
      if (!validateServiceId(params)) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidService));
      }

      const { dateFrom, dateTo } = params;
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      if (
        !dateFrom ||
        !dateTo ||
        Number.isNaN(fromDate.getTime()) ||
        Number.isNaN(toDate.getTime())
      ) {
        return res.json(paynetError(id, PAYNET_ERRORS.invalidParams));
      }

      const orders = await PUBG.find({
        status: "success",
        from: "paynet",
        createdAt: {
          $gte: fromDate,
          $lte: toDate,
        },
      }).sort({ createdAt: 1 });

      return res.json(
        paynetResult(id, {
          statements: orders.map((order) => ({
            transactionId: order.transId,
            amount: order.price_amount * 100,
            providerTrnId: order._id,
            timestamp: dayjs(order.updatedAt)
              .tz("Asia/Tashkent")
              .format("YYYY-MM-DD HH:mm:ss"),
          })),
        }),
      );
    } catch (error) {
      console.error("Paynet PUBG GetStatement xatoligi:", error);
      return res.json(paynetError(id, PAYNET_ERRORS.internalError));
    }
  }
}

export { PAYNET_ERRORS };
export default new PubgPaynetController();
