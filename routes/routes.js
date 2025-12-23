import express from "express";

// Import module routes
import * as controller from "../modules/fragment/fragment.controller.js";

import tonkeeperRoutes from "../modules/tonkeeper/tonkeeper.routes.js";
import mlbbController from "../modules/mlbb/mlbbController.js";
import uzumController from "../modules/fragment/uzumController.js";
import paynetController from "../modules/fragment/paynetController.js";

import middlewares from "../middlewares/authMiddleware.js";

const router = express.Router();

// Uzum
router.post(
  "/uzum/tg/check",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.check
);
router.post(
  "/uzum/tg/create",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.create
);
router.post(
  "/uzum/tg/confirm",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.confirm
);
router.post(
  "/uzum/tg/reverse",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.reverse
);
router.post(
  "/uzum/tg/status",
  [middlewares.auth, middlewares.checkServiceId],
  uzumController.status
);

// MLBB ----------------------------------------------------------------
router.post(
  "/uzum/mlbb/check",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.check
);
router.post(
  "/uzum/mlbb/create",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.create
);
router.post(
  "/uzum/mlbb/confirm",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.confirm
);
router.post(
  "/uzum/mlbb/reverse",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.reverse
);
router.post(
  "/uzum/mlbb/status",
  [middlewares.auth, middlewares.checkServiceId],
  mlbbController.status
);

// Paynet tg
router.post("paynet/", (req, res) => {
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
});

router.get("/fragment/balance", controller.getAccount);
router.get("/fragment/transaction/:id", controller.checkTransaction);

router.use("/tonkeeper", tonkeeperRoutes);

export default router;
