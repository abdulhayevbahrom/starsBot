import express from "express";

// Import module routes
import * as controller from "../modules/fragment/fragment.controller.js";

import tonkeeperRoutes from "../modules/tonkeeper/tonkeeper.routes.js";
import mlbbController from "../modules/mlbb/mlbbController.js";
import uzumController from "../modules/fragment/uzumController.js";

const router = express.Router();

router.post("/uzum/tg/check", uzumController.check);
router.post("/uzum/tg/create", uzumController.create);
router.post("/uzum/tg/confirm", uzumController.confirm);
router.post("/uzum/tg/reverse", uzumController.reverse);
router.post("/uzum/tg/status", uzumController.status);

router.post("/uzum/mlbb/check", mlbbController.check);
router.post("/uzum/mlbb/create", mlbbController.create);
router.post("/uzum/mlbb/confirm", mlbbController.confirm);
router.post("/uzum/mlbb/reverse", mlbbController.reverse);
router.post("/uzum/mlbb/status", mlbbController.status);

// Module routes
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
    return uzumController.getTelegramUser(req, res);
  }
  if (method === "getPrice") {
    return getPrices(req, res);
  }

  if (method === "PerformTransaction") {
    let type = req.body.params.fields.type;
    if (type === "star") {
      return controller.buyStars(req, res);
    } else if (type === "premium") {
      return controller.buyPremium(req, res);
    }
  }

  if (method === "CheckTransaction") {
    return controller.checkTransaction(req, res);
  }
});

router.get("/fragment/balance", controller.getAccount);
router.get("/fragment/transaction/:id", controller.checkTransaction);

router.use("/tonkeeper", tonkeeperRoutes);

export default router;
