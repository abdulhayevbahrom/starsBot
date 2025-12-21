import TelegramBot from "node-telegram-bot-api";
import Pricing from "../models/priceModel.js";

export default function initPricingBot({ token, adminIds }) {
  const bot = new TelegramBot(token, { polling: true });
  const ADMINS = adminIds.map((id) => Number(id));
  const isAdmin = (msg) => ADMINS.includes(msg.from.id);
  const userState = {};

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
        ["⭐ Star o‘zgartirish", "💎 Premium o‘zgartirish"],
        ["↩️ Bekor qilish"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };

  bot.onText(/\/start|\/menu/, (msg) => {
    if (!isAdmin(msg)) return;
    bot.sendMessage(msg.chat.id, "⚡️ Boshqaruv menyusi", mainMenu);
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    const text = msg?.text?.trim();
    const pricing = await getPricing();

    // Agar foydalanuvchi "Bekor qilish" bosgan bo‘lsa
    if (text === "↩️ Bekor qilish") {
      delete userState[chatId];
      return bot.sendMessage(
        chatId,
        "❌ Har qanday o‘zgartirish bekor qilindi",
        mainMenu
      );
    }

    // Har qanday yangi tugma bosilganda FSMni bekor qilish
    const newCommandKeys = [
      "⭐ Star narxi",
      "💎 Premium narxlar",
      "⭐ Star o‘zgartirish",
      "💎 Premium o‘zgartirish",
    ];
    if (newCommandKeys.includes(text)) {
      delete userState[chatId];
    }

    // FSM ishlayotgan bo‘lsa (narx kiritish)
    if (
      userState[chatId]?.action === "set_star" ||
      userState[chatId]?.action === "set_premium"
    ) {
      const price = Number(text);
      if (isNaN(price)) {
        return bot.sendMessage(chatId, "❌ Noto‘g‘ri qiymat. Raqam kiriting.");
      }

      const state = userState[chatId];

      try {
        if (state.action === "set_star") {
          pricing.starPrice = price;
          await pricing.save();
          bot.sendMessage(
            chatId,
            `✅ Star narxi yangilandi: ${price}`,
            mainMenu
          );
        } else if (state.action === "set_premium") {
          const index = pricing.premium.findIndex(
            (p) => p.months === state.months
          );
          if (index >= 0) pricing.premium[index].price = price;
          else pricing.premium.push({ months: state.months, price });
          await pricing.save();
          bot.sendMessage(
            chatId,
            `✅ Premium ${state.months} oy narxi yangilandi: ${price}`,
            mainMenu
          );
        }
      } catch (err) {
        console.error("❌ FSM error:", err);
        bot.sendMessage(
          chatId,
          "⚠️ Xatolik yuz berdi, keyinroq urinib ko‘ring",
          mainMenu
        );
      } finally {
        delete userState[chatId];
      }
      return;
    }

    // Tugmalar bilan ishlash
    switch (text) {
      case "⭐ Star narxi":
        bot.sendMessage(chatId, `⭐ Star narxi: ${pricing.starPrice}`);
        break;

      case "💎 Premium narxlar":
        let textResp = "💎 Premium narxlari:\n";
        pricing.premium.forEach((p) => {
          textResp += `• ${p.months} oy — ${p.price}\n`;
        });
        bot.sendMessage(chatId, textResp);
        break;

      case "⭐ Star o‘zgartirish":
        userState[chatId] = { action: "set_star" };
        bot.sendMessage(chatId, "⭐ Star narxini kiriting (raqam):");
        break;

      case "💎 Premium o‘zgartirish":
        userState[chatId] = { action: "choose_month" };
        const keyboard = {
          reply_markup: {
            keyboard: [["3 oy", "6 oy", "12 oy"], ["↩️ Bekor qilish"]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        };
        bot.sendMessage(
          chatId,
          "Qancha oy uchun premium narxini o‘zgartirasiz?",
          keyboard
        );
        break;

      case "3 oy":
      case "6 oy":
      case "12 oy":
        if (userState[chatId]?.action === "choose_month") {
          const months = Number(text.split(" ")[0]);
          userState[chatId] = { action: "set_premium", months };
          bot.sendMessage(
            chatId,
            `${months} oy uchun narxni kiriting (raqam):`
          );
        }
        break;

      default:
        // boshqa xabarlar uchun hech narsa qilmaymiz
        break;
    }
  });

  return bot;
}
