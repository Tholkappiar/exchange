import { Router } from "express";
import { RedisManager } from "../redis/redisManager";
import { MarketRegistry } from "../trade/MarketRegistry";

export const orderRouter = Router();

orderRouter.get("/order", (req, res) => {
    const { symbol } = req.body;
    const response = MarketRegistry.getInstance().getBook(symbol);
    res.send({ data: response });
});

orderRouter.post("/order", async (req, res) => {
    const payload = req.body;
    // res.send({ messgae: "order post", payload });
    const instance = await RedisManager.getInstance();
    const response = await instance.sendAndAait(payload);
    console.log("response : ", response);
    res.send(response);
});
