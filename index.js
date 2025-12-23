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

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
