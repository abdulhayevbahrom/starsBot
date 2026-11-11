import express from "express";

import paynetMlbb from "../modules/mlbb/paynetMlbb.js";

import pubgController from "../modules/pubg/pubgController.js";
// pubg paynet
import paynetPubg from "../modules/pubg/pubgPaynet.js";

import middlewares from "../middlewares/authMiddleware.js";

const router = express.Router();

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

// Paynet PUBG
router.all(
  "/paynet/pubg",
  [
    (req, res, next) => {
      if (req.method !== "POST") {
        return res.json({
          jsonrpc: "2.0",
          id: req.body?.id ?? null,
          error: { code: -32300, message: "Request method must be POST" },
        });
      }

      next();
    },
    middlewares.authPaynet,
    middlewares.checkPubgServiceIdPaynet,
  ],
  (req, res) => {
    return paynetPubg.dispatch(req, res);
  },
);

export default router;
