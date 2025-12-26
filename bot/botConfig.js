import TelegramBot from "node-telegram-bot-api";

export const bot = new TelegramBot(process.env.BOT_TOKEN_2, {
  polling: false,
});

export const botTg = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

export default bot;
