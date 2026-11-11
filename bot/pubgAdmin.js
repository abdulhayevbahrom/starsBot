import bot from "./botConfig.js";
import PUBG from "../models/pubg.js";

const ACTIONS = {
  complete: {
    status: "completed",
    label: "✅ Bajarildi",
  },
  cancel: {
    status: "cancelled",
    label: "❌ Bekor qilindi",
  },
};

let initialized = false;

const getAdminIds = () =>
  new Set(
    String(process.env.ADMIN_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

const answerCallback = async (queryId, options) => {
  try {
    await bot.answerCallbackQuery(queryId, options);
  } catch (error) {
    console.error("PUBG callback javobida xatolik:", error.message);
  }
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export async function sendPubgOrderToAdmins(order, options = {}) {
  const quantity = options.quantity ?? order.amount;
  const source = options.source ?? order.from;
  const playerName = options.playerName || order.player_name || "Noma'lum";

  const message = [
    `🆔 Player ID: <code>${escapeHtml(order.player_id)}</code>`,
    `👤 Nickname: ${escapeHtml(playerName)}`,
    `🪙 Miqdori: ${escapeHtml(quantity)} UC`,
    `💰 Manba: ${escapeHtml(source)}`,
    `📅 Sana: ${escapeHtml(order.createdAt.toLocaleString())}`,
    "⏳ Admin holati: Kutilmoqda",
  ].join("\n");

  const sentMessage = await bot.sendMessage(
    process.env.TG_GROUP_ID_PUBG,
    message,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Bajarildi",
              callback_data: `pubg:complete:${order._id}`,
            },
            {
              text: "❌ Bekor qilindi",
              callback_data: `pubg:cancel:${order._id}`,
            },
          ],
        ],
      },
    },
  );

  await PUBG.findByIdAndUpdate(order._id, {
    telegram_chat_id: String(sentMessage.chat.id),
    telegram_message_id: sentMessage.message_id,
  });
}

export function initPubgAdminBot() {
  if (initialized) return;
  initialized = true;

  bot.on("callback_query", async (query) => {
    const match = query.data?.match(/^pubg:(complete|cancel):([a-f\d]{24})$/i);
    if (!match) return;

    const adminId = String(query.from.id);
    if (!getAdminIds().has(adminId)) {
      await answerCallback(query.id, {
        text: "Sizda bu amal uchun ruxsat yo‘q",
        show_alert: true,
      });
      return;
    }

    const [, actionName, orderId] = match;
    const action = ACTIONS[actionName];
    const actionTime = new Date();

    try {
      const order = await PUBG.findOneAndUpdate(
        { _id: orderId, admin_status: "pending" },
        {
          $set: {
            admin_status: action.status,
            admin_id: adminId,
            admin_action_at: actionTime,
          },
        },
        { new: true },
      );

      if (!order) {
        const existingOrder = await PUBG.findById(orderId).lean();
        const decidedBy = existingOrder?.admin_id
          ? ` Admin ID: ${existingOrder.admin_id}`
          : "";

        await answerCallback(query.id, {
          text: existingOrder
            ? `Bu buyurtma avval hal qilingan.${decidedBy}`
            : "Buyurtma topilmadi",
          show_alert: true,
        });
        return;
      }

      await answerCallback(query.id, {
        text: action.label,
        show_alert: false,
      });

      const originalText = query.message?.text || "PUBG buyurtmasi";
      const updatedText = [
        originalText.replace(
          /⏳ Admin holati: Kutilmoqda$/,
          `${action.label}\n👮 Admin ID: ${adminId}`,
        ),
      ].join("\n");

      await bot.editMessageText(updatedText, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: [] },
      });
    } catch (error) {
      console.error("PUBG admin qarorida xatolik:", error);
      await answerCallback(query.id, {
        text: "Tizim xatosi yuz berdi",
        show_alert: true,
      });
    }
  });

  bot.on("polling_error", (error) => {
    console.error("Telegram polling xatoligi:", error.message);
  });

  if (!bot.isPolling()) {
    bot.startPolling().catch((error) => {
      console.error("Telegram polling ishga tushmadi:", error.message);
    });
  }
}
