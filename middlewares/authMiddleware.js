let permissons = [
  {
    login: "paynetloginforservice",
    password: "paynetpasswordforservice",
  },
];

let paynerSerivceIds = [3, 4];
const paynetPermission = permissons.find(
  (item) => item.login === "paynetloginforservice",
);

class middlewares {
  async authPaynet(req, res, next) {
    try {
      const { id } = req.body ?? {};
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          jsonrpc: "2.0",
          id: id ?? null,
          error: { code: 411, message: "Login yoki parol topilmadi" },
        });
      }

      let data = Buffer.from(token, "base64").toString("ascii");
      let [login, password] = data?.split(":");

      const user =
        paynetPermission?.login === login && paynetPermission?.password === password;

      if (!user) {
        return res.status(401).json({
          jsonrpc: "2.0",
          id: id ?? null,
          error: { code: 412, message: "Login yoki parol noto‘g‘ri" },
        });
      }

      next();
    } catch (err) {
      console.log(err);

      return res.json({
        jsonrpc: "2.0",
        id: req.body?.id ?? null,
        error: { code: -32603, message: "Tizim xatosi" },
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

  async checkPubgServiceIdPaynet(req, res, next) {
    const { id, params } = req.body ?? {};

    if (!params || typeof params !== "object") {
      return res.json({
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32602, message: "Majburiy parametr yo‘q" },
      });
    }

    if (params.serviceId !== 4) {
      return res.json({
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: 305, message: "Invalid service id" },
      });
    }

    next();
  }
}

export default new middlewares();
