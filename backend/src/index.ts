import "dotenv/config";
import express from "express";
import { orderRouter } from "./routes/order";
import { RedisManager } from "./redis/RedisManager";
import { WebsocketManager } from "./websocket/WebsocketManager";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { createUserIfNotExist } from "./utils/helperFunctions";
import { TickerRouter } from "./routes/ticker";
import { UserBalanceRouter } from "./routes/userBalance";

const app = express();

app.use(express.json());
app.use(clerkMiddleware());

// todo: refac these singleton workers - because we are only going to call this once somewhere
RedisManager.getInstance().then((r) => r?.startWorker());
WebsocketManager.getInstance().startWorker();

app.get("/", (req, res) => {
    res.send({ message: "healthy !" });
});

app.use("/order", requireAuth(), createUserIfNotExist, orderRouter);
app.use("/tickers", requireAuth(), createUserIfNotExist, TickerRouter);
app.use("/balances", requireAuth(), createUserIfNotExist, UserBalanceRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`BACKEND STARTED IN PORT : ${PORT}`));
