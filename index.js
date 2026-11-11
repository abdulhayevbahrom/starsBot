import "dotenv/config";
import express from "express";
import helmet from "helmet";
import router from "./routes/routes.js";
import connectDB from "./config/config.js";

const PORT = process.env.PORT || 8070;

const app = express();

await connectDB();
app.use(express.json());
app.use(helmet());

app.get("/", (req, res) => res.send("Salom dunyo!"));
app.use("/api", router);

app.use((error, req, res, next) => {
  if (
    error instanceof SyntaxError &&
    "body" in error &&
    req.originalUrl.startsWith("/api/paynet/pubg")
  ) {
    return res.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "JSON parse error" },
    });
  }

  next(error);
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
