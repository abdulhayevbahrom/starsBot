import express from "express";
import * as controller from "./tonkeeper.controller.js";

const router = express.Router();

// Wallet ma'lumotlari
router.get("/wallet", controller.getWalletInfo);

// Balans
router.get("/balance", controller.getBalance);

router.get("/transactions", controller.getTransactions);

router.post("/send", controller.sendTon);

export default router;
