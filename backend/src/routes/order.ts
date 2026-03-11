import { Router } from "express";
import { RedisManager } from "../redis/redisManager";

export const orderRouter = Router();

orderRouter.get("/order", (req, res) => {
    res.send({ message: "order get" });
});

orderRouter.post("/order", async (req, res) => {
    const payload = req.body;
    // res.send({ messgae: "order post", payload });
    const instance = await RedisManager.getInstance();
    const response = await instance.sendAndAait(payload);
    console.log("response : ", response);
    res.send(response);
});
