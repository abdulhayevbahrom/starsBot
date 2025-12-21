import fetch from "node-fetch";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Pricing from "../../models/priceModel.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function getTelegramUser(req, res) {
  try {
    let { id, params } = req.body;
    let { username } = params.fields;

    if (!username) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Majburiy parametr yo‘q" },
      });
    }

    const url = `${process.env.API_BASE}/star/recipient/search?username=${username}&quantity=50`;
    let headers = {
      "API-Key": process.env.API_KEY,
    };
    const response = await fetch(url, {
      headers,
    });

    let data = await response.json();

    if (!data.success) {
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
          name: data.name,
        },
      },
    });
  } catch (err) {
    console.error("Error fetching Telegram user:", err);
    return res.json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32603, message: "Tizim xatosi", err },
    });
  }
}

export async function getPrices(req, res) {
  try {
    let { id, params } = req.body;
    let { star, month } = params.fields || {};

    if (!star && !month) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Majburiy parametr yo‘q" },
      });
    }

    // Star cheklovlari
    if (star && (star < 50 || star > 10000)) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: {
          code: 413,
          message:
            "Yulduzlar soni 50 dan kam bo'lmasligi va 10000 dan oshmasligi kerak",
        },
      });
    }

    // Premium oy cheklovlari
    if (month && ![3, 6, 12].includes(+month)) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: {
          code: 413,
          message: "Premium oylar soni 3, 6 yoki 12 bo'lishi kerak",
        },
      });
    }

    const pricing = await Pricing.findOne({});
    let totalPrice = 0;

    if (star) {
      totalPrice += +star * (pricing ? pricing.starPrice : 0);
    }

    if (month) {
      const premiumOption = pricing
        ? pricing.premium.find((p) => p.months === +month)
        : null;
      if (premiumOption) totalPrice += premiumOption.price;
    }

    // Tiyinda qaytarish
    const totalPriceInTiyin = Math.round(totalPrice * 100);

    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        status: "0",
        timestamp: dayjs().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
        fields: {
          price: totalPriceInTiyin,
        },
      },
    });
  } catch (err) {
    console.error("❌ getPrices error:", err);
    return res.json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32603, message: "Tizim xatosi", err },
    });
  }
}
