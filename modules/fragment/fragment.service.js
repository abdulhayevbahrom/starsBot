import axios from "axios";
import { getTonkeeperService } from "../tonkeeper/tonkeeper.service.js";
import { Order } from "../../models/order.js";

const API_KEY = process.env.ROBYNHOOD_API_KEY;

const api = axios.create({
  baseURL:
    process.env.ROBYNHOOD_API_URL || "https://robynhood.parssms.info/api",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
  timeout: 30000,
});

const tonkeeper = getTonkeeperService();

// const VALID_STAR_AMOUNTS = [50, 100, 200, 500, 1000, 2500, 5000, 10000];
const VALID_PREMIUM_MONTHS = [3, 6, 12];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryOperation = async (operation, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(
        `❌ Urinish ${i + 1}/${maxRetries} muvaffaqiyatsiz:`,
        error.response?.data || error.message
      );
      if (i < maxRetries - 1) {
        console.log(`⏳ 5 soniyadan keyin qayta urinish...`);
        await sleep(5000);
      }
    }
  }
  throw lastError;
};

export const getProductPriceTON = async (
  productType,
  { quantity, months, amount }
) => {
  try {
    const params = { product_type: productType };
    if (quantity) params.quantity = String(quantity);
    if (months) params.months = String(months);
    if (amount) params.amount = String(amount);

    const response = await api.get("/api/prices", { params });
    let priceObj = response.data;
    if (Array.isArray(priceObj)) {
      priceObj = priceObj[0];
    }

    // console.log("📊 API /api/prices javobi:", priceObj, "| params:", params);

    if (priceObj.currency !== "TON") {
      throw new Error(
        `Kutilmagan valyuta: ${priceObj.currency}. Faqat TON qo'llab-quvvatlanadi.`
      );
    }

    const priceInTON = parseFloat(priceObj.price);

    if (isNaN(priceInTON) || priceInTON <= 0) {
      throw new Error(
        "Narxni hisoblashda API noto'g'ri javob qaytardi: " +
          JSON.stringify(response.data)
      );
    }

    // console.log(`💰 ${priceObj.item_name}: ${priceInTON} TON`);
    return priceInTON;
  } catch (error) {
    console.error(
      "❌ Narxni hisoblashda xatolik:",
      error.response?.data || error.message
    );
    throw new Error(
      "Narxni hisoblashda xatolik: " +
        (error.response?.data?.error || error.message)
    );
  }
};

export const getTonPrice = async (productType, amount) => {
  if (productType === "stars") {
    const tonPrice = await getProductPriceTON("stars", { quantity: amount });
    if (!tonPrice) throw new Error(`Noto'g'ri stars miqdori: ${amount}`);
    return tonPrice;
  } else if (productType === "premium") {
    const tonPrice = await getProductPriceTON("premium", { months: amount });
    if (!tonPrice) throw new Error(`Noto'g'ri premium oy: ${amount}`);
    return tonPrice;
  } else {
    throw new Error(`Noto'g'ri product type: ${productType}`);
  }
};

export const getAccountInfo = async () => {
  try {
    const response = await api.get("/api/balance");
    // console.log("💰 Fragment account:", response.data);
    return response.data;
  } catch (error) {
    // console.error("❌ Account error:", error.response?.data || error.message);
    throw error;
  }
};

const createTopupInvoice = async (amount) => {
  try {
    const payload = { amount: Number(amount) };
    const response = await api.post("/merchants/topup", payload, {
      headers: { "X-API-Key": API_KEY },
    });
    // console.log("✅ Top-up invoice yaratildi:", response.data);
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    console.error(`❌ Top-up invoice xatolik: [${status}] ${msg}`);

    if (status === 404) {
      throw new Error("Top-up invoice yaratilmadi: resurs topilmadi (404).");
    }
    if (status === 401) {
      throw new Error(
        "Top-up invoice yaratilmadi: API kaliti noto'g'ri (401)."
      );
    }
    throw new Error(`Top-up invoice xatolik (status: ${status}): ${msg}`);
  }
};

const ensureFragmentBalance = async (requiredTonAmount) => {
  // console.log(`🔍 Fragment balansini tekshiryapman...`);

  const fragmentAccount = await getAccountInfo();
  const currentBalance = parseFloat(fragmentAccount.mainnet_balance || 0);

  // console.log(`💳 Fragment balans: ${currentBalance.toFixed(4)} TON`);
  // console.log(`💰 Kerakli miqdor: ${requiredTonAmount.toFixed(4)} TON`);

  const SAFETY_MARGIN = 0.05;
  const minRequired = requiredTonAmount + SAFETY_MARGIN;

  if (currentBalance >= requiredTonAmount) {
    // console.log("✅ Fragment balans yetarli");
    return true;
  }

  // console.log(`⚠️ Balans yetarli emas. Kerak: ${minRequired.toFixed(4)} TON`);

  const topupAmount = Number((minRequired - currentBalance + 0.01).toFixed(6));
  const invoice = await createTopupInvoice(topupAmount);

  const sendAmount = parseFloat(invoice.amount);
  const walletAddress = invoice.wallet_address;

  // console.log(`📍 Manzil: ${walletAddress}`);
  // console.log(`💵 Miqdor: ${sendAmount.toFixed(4)} TON`);
  // console.log(`⏰ Muddat: ${invoice.expires_at}`);

  const tkBalance = await tonkeeper.getBalance();
  if (tkBalance >= sendAmount) {
    // console.log(
    //   `💸 Tonkeeper dan ${sendAmount.toFixed(6)} TON yuborilmoqda...`
    // );
    await tonkeeper.sendTon(
      walletAddress,
      sendAmount,
      "Auto top-up to Fragment"
    );
    // console.log("✅ Auto deposit yuborildi");
  } else {
    throw new Error(
      `Tonkeeper balansida yetarli TON yo'q. Kerak: ${sendAmount.toFixed(
        6
      )} TON, Bor: ${tkBalance.toFixed(6)} TON`
    );
  }

  // console.log("⏳ Deposit tasdiqlanishini kutyapman (maks 60s)...");
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    const updatedAccount = await getAccountInfo();
    const newBalance = parseFloat(updatedAccount.mainnet_balance || 0);
    // console.log(
    //   `🔄 Tekshiruv ${i + 1}/12: balans = ${newBalance.toFixed(4)} TON`
    // );

    if (newBalance >= requiredTonAmount) {
      // console.log("✅ Deposit tasdiqlandi!");
      return true;
    }
  }

  throw new Error(
    "Deposit 60 soniyada tasdiqlanmadi. Keyinroq urinib ko'ring."
  );
};

export const buyStars = async (
  userId,
  amount,
  transactionId,
  payTon = true,
  isTest = false
) => {
  // if (!VALID_STAR_AMOUNTS.includes(Number(amount))) {
  //   throw new Error(
  //     `Stars faqat: ${VALID_STAR_AMOUNTS.join(", ")}. Siz yuborgan: ${amount}`
  //   );
  // }

  const tonAmount = await getTonPrice("stars", amount);
  // console.log(`💰 ${amount} Stars uchun kerak: ${tonAmount.toFixed(4)} TON`);

  // 1️⃣ Order yaratish (pending)
  let order;
  try {
    order = await Order.create({
      userId: String(userId),
      productType: "stars",
      amount: Number(amount),
      tonAmount,
      status: "pending",
      fragmentTx: {},
      errorMessage: null,
      transId: transactionId,
    });
    // console.log(`📝 Order yaratildi (pending): ${order._id}`);
  } catch (dbError) {
    throw dbError;
    // console.error("⚠️ MongoDB'ga yozishda xatolik:", dbError.message);
  }

  // 2️⃣ Balansni tekshirish
  if (payTon && !isTest) {
    try {
      await ensureFragmentBalance(tonAmount);
    } catch (balanceError) {
      if (order) {
        try {
          await Order.findByIdAndUpdate(order._id, {
            status: "failed",
            errorMessage: `Balans yetarli emas: ${balanceError.message}`,
            updatedAt: new Date(),
          });
        } catch (updateError) {
          // console.error("⚠️ Order yangilashda xatolik:", updateError.message);
        }
      }
      throw balanceError;
    }
  }

  // 3️⃣ Fragment API ga xarid so'rovi
  try {
    const result = await retryOperation(async () => {
      const endpoint = isTest ? "/test/purchase" : "/api/purchase";
      const payload = {
        product_type: "stars",
        recipient: String(userId),
        quantity: String(amount),
        idempotency_key: `stars_${String(userId).replace(
          /[@\W]/g,
          ""
        )}_${transactionId}`,
      };
      // console.log(`📤 Fragment xarid so'rovi: ${endpoint}`, payload);
      const response = await api.post(endpoint, payload);
      // console.log("✅ Stars xarid muvaffaqiyatli:", response.data);
      return response.data;
    });

    // 4️⃣ Order statusini yangilash (success)
    if (order) {
      try {
        await Order.findByIdAndUpdate(order._id, {
          status: "success",
          fragmentTx: result,
          errorMessage: null,
          updatedAt: new Date(),
        });
        // console.log(`✅ Order yangilandi (success): ${order._id}`);
      } catch (updateError) {
        // console.error("⚠️ Order yangilashda xatolik:", updateError.message);
      }
    }

    return { fragment: result, success: true, tonAmount, order };
  } catch (purchaseError) {
    // 5️⃣ Order statusini yangilash (failed)
    if (order) {
      try {
        await Order.findByIdAndUpdate(order._id, {
          status: "failed",
          fragmentTx: purchaseError.response?.data || {},
          errorMessage: purchaseError.message,
          updatedAt: new Date(),
        });
        // console.log(`❌ Order yangilandi (failed): ${order._id}`);
      } catch (updateError) {
        console.error("⚠️ Order yangilashda xatolik:", updateError.message);
      }
    }
    throw purchaseError;
  }
};

export const buyPremium = async (
  userId,
  months,
  transactionId,
  payTon = true,
  isTest = false
) => {
  if (!VALID_PREMIUM_MONTHS.includes(Number(months))) {
    throw new Error(
      `Premium faqat: ${VALID_PREMIUM_MONTHS.join(
        ", "
      )} oy. Siz yuborgan: ${months}`
    );
  }

  const tonAmount = await getTonPrice("premium", months);
  // console.log(
  //   `💰 ${months} oy Premium uchun kerak: ${tonAmount.toFixed(4)} TON`
  // );

  // 1️⃣ Order yaratish (pending)
  let order;
  try {
    order = await Order.create({
      userId: String(userId),
      productType: "premium",
      amount: Number(months),
      tonAmount,
      status: "pending",
      fragmentTx: {},
      errorMessage: null,
      transId: transactionId,
    });
    // console.log(`📝 Order yaratildi (pending): ${order._id}`);
  } catch (dbError) {
    throw dbError;
    // console.error("⚠️ MongoDB'ga yozishda xatolik:", dbError.message);
  }

  // 2️⃣ Balansni tekshirish
  if (payTon && !isTest) {
    try {
      await ensureFragmentBalance(tonAmount);
    } catch (balanceError) {
      if (order) {
        try {
          await Order.findByIdAndUpdate(order._id, {
            status: "failed",
            errorMessage: `Balans yetarli emas: ${balanceError.message}`,
            updatedAt: new Date(),
          });
        } catch (updateError) {
          // console.error("⚠️ Order yangilashda xatolik:", updateError.message);
        }
      }
      throw balanceError;
    }
  }

  // 3️⃣ Fragment API ga xarid so'rovi
  try {
    const result = await retryOperation(async () => {
      const endpoint = isTest ? "/test/purchase" : "/api/purchase";
      const payload = {
        product_type: "premium",
        recipient: String(userId),
        months: String(months),
        idempotency_key: `premium_${String(userId).replace(
          /[@\W]/g,
          ""
        )}_${transactionId}`,
      };
      // console.log(`📤 Fragment xarid so'rovi: ${endpoint}`, payload);
      const response = await api.post(endpoint, payload);
      // console.log("✅ Premium xarid muvaffaqiyatli:", response.data);
      return response.data;
    });

    // 4️⃣ Order statusini yangilash (success)
    if (order) {
      try {
        await Order.findByIdAndUpdate(order._id, {
          status: "success",
          fragmentTx: result,
          errorMessage: null,
          updatedAt: new Date(),
        });
        // console.log(`✅ Order yangilandi (success): ${order._id}`);
      } catch (updateError) {
        console.error("⚠️ Order yangilashda xatolik:", updateError.message);
      }
    }

    return { fragment: result, success: true, tonAmount, orderId: order?._id };
  } catch (purchaseError) {
    // 5️⃣ Order statusini yangilash (failed)
    if (order) {
      try {
        await Order.findByIdAndUpdate(order._id, {
          status: "failed",
          fragmentTx: purchaseError.response?.data || {},
          errorMessage: purchaseError.message,
          updatedAt: new Date(),
        });
        // console.log(`❌ Order yangilandi (failed): ${order._id}`);
      } catch (updateError) {
        console.error("⚠️ Order yangilashda xatolik:", updateError.message);
      }
    }
    throw purchaseError;
  }
};

export const getAllProductPrices = async () => {
  try {
    const response = await api.get("/api/prices/list");
    return response.data;
  } catch (error) {
    console.error(
      "❌ Narxlar ro'yxatini olishda xatolik:",
      error.response?.data || error.message
    );
    throw new Error(
      "Narxlar ro'yxatini olishda xatolik: " +
        (error.response?.data?.error || error.message)
    );
  }
};

export const checkTransaction = async (transactionId) => {
  try {
    const response = await api.get(`/purchase/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Transaction tekshirishda xatolik:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const checkModule = async (type, amount) => {
  try {
    const tonAmount = await getTonPrice(type, amount);
    await ensureFragmentBalance(tonAmount);
    return { success: true };
  } catch (balanceError) {
    throw balanceError;
  }
};
