import { Router } from "express";
import { MarketRegistry } from "../trade/MarketRegistry";
import { RedisManager } from "../redis/RedisManager";

export const orderRouter = Router();

orderRouter.get("/order", (req, res) => {
    const { symbol } = req.body;
    const response = MarketRegistry.getInstance().getBook(symbol);
    res.send({ data: response });
});

orderRouter.post("/order", async (req, res) => {
    const payload = req.body;
    const instance = await RedisManager.getInstance();
    const response = await instance.sendAndAwait(payload);
    res.send(response);
});

orderRouter.get("/tickers", async (req, res) => {
    const response = MarketRegistry.getInstance().getAllTickers();
    res.send(response);
});

orderRouter.get("/ticker", async (req, res) => {
    const payload = req.body;
    const response = MarketRegistry.getInstance().getTicker(payload);
    res.send(response);
});
