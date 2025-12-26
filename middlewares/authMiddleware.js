import { json } from "express";

let permissons = [
  {
    login: "uzumloginfortg",
    password: "uzumpasswordfortg",
  },
  {
    login: "uzumloginformlbb",
    password: "uzumpasswordformlbb",
  },
  {
    login: "uzumloginforpubg",
    password: "uzumpasswordforpubg",
  },
  {
    login: "paynetloginforservice",
    password: "paynetpasswordforservice",
  },
];

let serviceIds = [7814652, 6515872, 4531225];
let paynerSerivceIds = [1, 2, 3];

class middlewares {
  async auth(req, res, next) {
    try {
      const token = req.headers.authorization.split(" ")[1];

      if (!token) {
        return res.json({
          serviceId: req.body.serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      let data = Buffer.from(token, "base64").toString("ascii");
      let [login, password] = data?.split(":");

      let user = permissons.find(
        (item) => item.login === login && item.password === password
      );

      if (!user) {
        return res.json({
          serviceId: req.body.serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10001",
        });
      }

      next();
    } catch (e) {
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: "99999",
      });
    }
  }

  async authPaynet(req, res, next) {
    try {
      const { id } = req.body;
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 411, message: "login or password not found" },
        });
      }

      let data = Buffer.from(token, "base64").toString("ascii");
      let [login, password] = data?.split(":");

      let user = permissons.find(
        (item) => item.login === login && item.password === password
      );

      if (!user) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 401, message: "unauthorized" },
        });
      }

      next();
    } catch (err) {
      console.log(err);

      return res.json({
        jsonrpc: "2.0",
        id: req.body.id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }

  async checkServiceId(req, res, next) {
    try {
      const { serviceId } = req.body;

      if (typeof serviceId !== "number") {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      if (!serviceId) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10005",
        });
      }

      if (!serviceIds.includes(serviceId)) {
        return res.json({
          serviceId: serviceId,
          timestamp: Date.now(),
          status: "FAILED",
          errorCode: "10006",
        });
      }

      next();
    } catch (e) {
      return res.json({
        serviceId: req.body.serviceId,
        timestamp: Date.now(),
        status: "FAILED",
        errorCode: "99999",
      });
    }
  }

  async checkServiceIdPaynet(req, res, next) {
    try {
      const { id } = req.body;
      const { serviceId } = req.body.params;

      if (typeof serviceId !== "number") {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 305, message: "Invalid service id" },
        });
      }

      if (!serviceId) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 305, message: "Invalid service id" },
        });
      }

      if (!paynerSerivceIds.includes(serviceId)) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: 305, message: "Invalid service id" },
        });
      }

      next();
    } catch (err) {
      console.log(err);
      return res.json({
        jsonrpc: "2.0",
        id: req?.body?.id || null,
        error: { code: -32603, message: "Tizim xatosi", err },
      });
    }
  }
}

export default new middlewares();
