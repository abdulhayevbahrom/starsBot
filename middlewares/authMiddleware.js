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
    login: "paynet",
    password: "paynet",
  },
];

let serviceIds = [7814652, 6515872, 4531225];

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
      let [login, password] = data.split(":");

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
}

export default new middlewares();
