import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { orderRouter } from "./routes/order";
import { RedisWorkerManager } from "./trade/redisWorkerManager";

const app = express();
app.use(express.json());

RedisWorkerManager.getInstance().then((r) => r?.startWorker());
app.get("/", (req, res) => {
    res.send({ message: "healthy !" });
});

app.use("/", orderRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BACKEND STARTED IN PORT : ${PORT}`));
