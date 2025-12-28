import TelegramBot from "node-telegram-bot-api";
import Pricing from "../models/priceModel.js";
import { Order } from "../models/order.js";
import { botTg as bot } from "./botConfig.js";

export default function initPricingBot({ adminIds }) {
  const ADMINS = adminIds.map((id) => Number(id));
  const isAdmin = (msg) => ADMINS.includes(msg.from.id);
  const userState = {};
  const successPageState = {};

  async function getPricing() {
    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = await Pricing.create({
        starPrice: 0,
        premium: [
          { months: 3, price: 0 },
          { months: 6, price: 0 },
          { months: 12, price: 0 },
        ],
      });
    }
    return pricing;
  }

  const mainMenu = {
    reply_markup: {
      keyboard: [
        ["⭐ Star narxi", "💎 Premium narxlar"],
        ["⭐ Star o'zgartirish", "💎 Premium o'zgartirish"],
        ["❌ Failed buyurtmalar", "✅ Muvaffaqiyatli buyurtmalar"],
        ["↩️ Bekor qilish"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };

  // /start va /menu komandalarini alohida handle qilish
  bot.onText(/\/start|\/menu/, async (msg) => {
    if (!isAdmin(msg)) return;
    await bot.sendMessage(msg.chat.id, "⚡️ Boshqaruv menyusi", mainMenu);
  });

  async function sendSuccessOrders(chatId, page = 1) {
    const limit = 5;
    const skip = (page - 1) * limit;

    const total = await Order.countDocuments({ status: "success" });

    if (!total) {
      return bot.sendMessage(chatId, "✅ Muvaffaqiyatli buyurtmalar yo'q");
    }

    const orders = await Order.find({ status: "success" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("userId productType amount createdAt")
      .lean();

    let text = `✅ *Muvaffaqiyatli buyurtmalar*\n`;
    text += `📄 Sahifa: ${page} / ${Math.ceil(total / limit)}\n\n`;

    orders.forEach((o, i) => {
      text +=
        `#${skip + i + 1}\n` +
        `👤 User: ${o.userId}\n` +
        `📦 Product: ${o.productType}\n` +
        `📊 Miqdor: ${o.amount}\n` +
        `📅 Sana: ${new Date(o.createdAt).toLocaleString()}\n\n`;
    });

    const keyboard = [];

    if (page > 1) {
      keyboard.push({
        text: "⬅️ Oldingi",
        callback_data: `success_prev_${page - 1}`,
      });
    }

    if (page * limit < total) {
      keyboard.push({
        text: "➡️ Keyingi",
        callback_data: `success_next_${page + 1}`,
      });
    }

    await bot.sendMessage(chatId, text, {
      // parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [keyboard],
      },
    });
  }

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;

    const text = msg?.text?.trim();

    // Agar text yo'q bo'lsa yoki komanda bo'lsa, o'tkazib yuboramiz
    if (!text || text.startsWith("/")) return;

    // Bekor qilish
    if (text === "↩️ Bekor qilish") {
      delete userState[chatId];
      return bot.sendMessage(
        chatId,
        "❌ Har qanday o'zgartirish bekor qilindi",
        mainMenu
      );
    }

    // FSM: Star narxini o'zgartirish
    if (userState[chatId]?.action === "set_star") {
      const price = Number(text);
      if (isNaN(price) || price < 0) {
        return bot.sendMessage(
          chatId,
          "❌ Noto'g'ri qiymat. Musbat raqam kiriting."
        );
      }

      try {
        const pricing = await getPricing();
        pricing.starPrice = price;
        await pricing.save();

        delete userState[chatId];

        return bot.sendMessage(
          chatId,
          `✅ Star narxi muvaffaqiyatli yangilandi: ${price}`,
          mainMenu
        );
      } catch (err) {
        console.error("❌ Star narxini saqlashda xatolik:", err);
        delete userState[chatId];
        return bot.sendMessage(
          chatId,
          "⚠️ Xatolik yuz berdi, keyinroq urinib ko'ring",
          mainMenu
        );
      }
    }

    // FSM: Premium narxini o'zgartirish
    if (userState[chatId]?.action === "set_premium") {
      const price = Number(text);
      if (isNaN(price) || price < 0) {
        return bot.sendMessage(
          chatId,
          "❌ Noto'g'ri qiymat. Musbat raqam kiriting."
        );
      }

      const state = userState[chatId];

      try {
        const pricing = await getPricing();
        const index = pricing.premium.findIndex(
          (p) => p.months === state.months
        );

        if (index >= 0) {
          pricing.premium[index].price = price;
        } else {
          pricing.premium.push({ months: state.months, price });
        }

        await pricing.save();

        delete userState[chatId];

        return bot.sendMessage(
          chatId,
          `✅ Premium ${state.months} oy narxi muvaffaqiyatli yangilandi: ${price}`,
          mainMenu
        );
      } catch (err) {
        console.error("❌ Premium narxini saqlashda xatolik:", err);
        delete userState[chatId];
        return bot.sendMessage(
          chatId,
          "⚠️ Xatolik yuz berdi, keyinroq urinib ko'ring",
          mainMenu
        );
      }
    }

    // Tugmalar bilan ishlash
    const pricing = await getPricing();

    switch (text) {
      case "⭐ Star narxi":
        await bot.sendMessage(
          chatId,
          `⭐ Hozirgi Star narxi: ${pricing.starPrice}`
        );
        break;

      case "💎 Premium narxlar": {
        let textResp = "💎 Premium narxlari:\n\n";
        pricing.premium.forEach((p) => {
          textResp += `• ${p.months} oy — ${p.price}\n`;
        });
        await bot.sendMessage(chatId, textResp);
        break;
      }

      case "⭐ Star o'zgartirish":
        delete userState[chatId];
        userState[chatId] = { action: "set_star" };
        await bot.sendMessage(
          chatId,
          `⭐ Hozirgi Star narxi: ${pricing.starPrice}\n\nYangi Star narxini kiriting (raqam):`,
          { reply_markup: { remove_keyboard: true } }
        );
        break;

      case "💎 Premium o'zgartirish":
        delete userState[chatId];
        userState[chatId] = { action: "choose_month" };
        const keyboard = {
          reply_markup: {
            keyboard: [["3 oy", "6 oy", "12 oy"], ["↩️ Bekor qilish"]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        };
        await bot.sendMessage(
          chatId,
          "Qancha oy uchun premium narxini o'zgartirasiz?",
          keyboard
        );
        break;

      case "3 oy":
      case "6 oy":
      case "12 oy":
        if (userState[chatId]?.action === "choose_month") {
          const months = Number(text.split(" ")[0]);
          const currentPrice =
            pricing.premium.find((p) => p.months === months)?.price || 0;

          userState[chatId] = { action: "set_premium", months };

          await bot.sendMessage(
            chatId,
            `💎 Hozirgi ${months} oy narxi: ${currentPrice}\n\nYangi narxni kiriting (raqam):`,
            { reply_markup: { remove_keyboard: true } }
          );
        }
        break;

      case "❌ Failed buyurtmalar": {
        const failedOrders = await Order.find({ status: { $ne: "success" } })
          .sort({ createdAt: -1 })
          .limit(10);

        if (!failedOrders.length) {
          return bot.sendMessage(
            chatId,
            "❌ Failed buyurtmalar yo'q",
            mainMenu
          );
        }

        for (const o of failedOrders) {
          await bot.sendMessage(
            chatId,
            [
              `❌ FAILED BUYURTMA`,
              `👤 User: ${o.userId}`,
              `📦 Product: ${o.productType}`,
              `📊 Miqdor: ${o.amount}`,
              `📝 Status: ${o.status}`,
              `📅 Buyurtma vaqti: ${new Date(o.createdAt).toLocaleString()}`,
              `❓ Sabab: ${o.errorMessage || "Noma'lum"}`,
            ].join("\n"),
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Qo'lda bajarildi",
                      callback_data: `done_${o._id}`,
                    },
                  ],
                ],
              },
            }
          );
        }
        break;
      }

      case "✅ Muvaffaqiyatli buyurtmalar":
        successPageState[chatId] = 1;
        await sendSuccessOrders(chatId, 1);
        break;

      default:
        // Noma'lum xabar
        break;
    }
  });

  bot.on("callback_query", async (query) => {
    const msg = query.message;
    const data = query.data;

    if (!ADMINS.includes(query.from.id)) {
      return bot.answerCallbackQuery(query.id, {
        text: "❌ Sizda ruxsat yo'q",
        show_alert: true,
      });
    }

    // SUCCESS pagination
    if (data.startsWith("success_")) {
      const [, type, page] = data.split("_");
      successPageState[msg.chat.id] = Number(page);
      await sendSuccessOrders(msg.chat.id, Number(page));
      return bot.answerCallbackQuery(query.id);
    }

    // Failed order SUCCESS qilish
    if (data.startsWith("done_")) {
      const orderId = data.replace("done_", "");

      const order = await Order.findById(orderId);
      if (!order) {
        return bot.answerCallbackQuery(query.id, {
          text: "❌ Buyurtma topilmadi",
          show_alert: true,
        });
      }

      if (order.status === "success") {
        return bot.answerCallbackQuery(query.id, {
          text: "⚠️ Bu buyurtma allaqachon SUCCESS",
          show_alert: true,
        });
      }

      order.status = "success";
      order.updatedAt = new Date();
      await order.save();

      // Tugmani o'chirish
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
        }
      );

      await bot.answerCallbackQuery(query.id, {
        text: "✅ Buyurtma SUCCESS qilindi",
        show_alert: false,
      });
    }
  });

  return bot;
}
