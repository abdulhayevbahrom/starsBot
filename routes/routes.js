import express from "express";

// Import module routes
import * as controller from "../modules/fragment/fragment.controller.js";

import mlbbController from "../modules/mlbb/mlbbController.js";
import uzumController from "../modules/fragment/uzumController.js";
import paynetController from "../modules/fragment/paynetController.js";
import paynetMlbb from "../modules/mlbb/paynetMlbb.js";

import pubgController from "../modules/pubg/pubgController.js";
// pubg paynet
import paynetPubg from "../modules/pubg/pubgPaynet.js";

import middlewares from "../middlewares/authMiddleware.js";

import {
  getWalletInfo,
  getBalance,
  getTransactions,
  sendTon,
} from "../modules/tonkeeper/tonkeeper.controller.js";

const router = express.Router();

// Uzum
router.post(
  "/uzum/tg/check",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.check,
);
router.post(
  "/uzum/tg/create",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.create,
);
router.post(
  "/uzum/tg/confirm",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.confirm,
);
router.post(
  "/uzum/tg/reverse",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.reverse,
);
router.post(
  "/uzum/tg/status",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.status,
);

// MLBB ----------------------------------------------------------------
router.post(
  "/uzum/mlbb/check",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.check,
);
router.post(
  "/uzum/mlbb/create",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.create,
);
router.post(
  "/uzum/mlbb/confirm",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.confirm,
);
router.post(
  "/uzum/mlbb/reverse",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.reverse,
);
router.post(
  "/uzum/mlbb/status",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.status,
);

// uzum pubg

router.post(
  "/uzum/pubg/check",
  [middlewares.auth, middlewares.checkServiceId],
  pubgController.check,
);

router.post(
  "/uzum/pubg/create",
  [middlewares.auth, middlewares.checkServiceId],
  pubgController.create,
);

router.post(
  "/uzum/pubg/confirm",
  [middlewares.auth, middlewares.checkServiceId],
  pubgController.confirm,
);

router.post(
  "/uzum/pubg/status",
  [middlewares.auth, middlewares.checkServiceId],
  pubgController.status,
);

// ===========================================================

// Paynet tg
router.post(
  "/paynet/tg",
  [middlewares.authPaynet, middlewares.checkServiceIdPaynet],
  (req, res) => {
    let { method, id } = req.body;

    if (!method) {
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Method ko‘rsatilmagan" },
      });
    }

    if (method === "GetInformation") {
      return paynetController.getInformation(req, res);
    }

    if (method === "PerformTransaction") {
      return paynetController.performTransaction(req, res);
    }

    if (method === "CheckTransaction") {
      return paynetController.checkTransaction(req, res);
    }

    if (method === "GetStatement") {
      return paynetController.getStatement(req, res);
    }
  },
);

router.post(
  "/paynet/mlbb",
  [middlewares.authPaynet, middlewares.checkServiceIdPaynet],
  (req, res) => {
    let { method, id } = req.body;

    if (!method) {
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Method ko‘rsatilmagan" },
      });
    }

    if (method === "GetInformation") {
      return paynetMlbb.getInformation(req, res);
    }

    if (method === "PerformTransaction") {
      return paynetMlbb.performTransaction(req, res);
    }

    if (method === "CheckTransaction") {
      return paynetMlbb.checkTransaction(req, res);
    }

    if (method === "GetStatement") {
      return paynetMlbb.getStatement(req, res);
    }
  },
);

// Paynet pubg
router.post(
  "/paynet/pubg",
  [middlewares.authPaynet, middlewares.checkServiceIdPaynet],
  (req, res) => {
    let { method, id } = req.body;

    if (!method) {
      return res.json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Method ko‘rsatilmagan" },
      });
    }

    if (method === "GetInformation") {
      return paynetPubg.getInformation(req, res);
    }

    if (method === "PerformTransaction") {
      return paynetPubg.performTransaction(req, res);
    }

    if (method === "CheckTransaction") {
      return paynetPubg.checkTransaction(req, res);
    }

    if (method === "GetStatement") {
      return paynetPubg.getStatement(req, res);
    }
  },
);

// Fragment
router.get("/fragment/balance", controller.getAccount);
router.get("/fragment/transaction/:id", controller.checkTransaction);

// Tonkeeper
router.get("/tonkeeper/wallet", getWalletInfo);
router.get("/tonkeeper/balance", getBalance);
router.get("/tonkeeper/transactions", getTransactions);
router.post("/tonkeeper/send", sendTon);
export default router;
