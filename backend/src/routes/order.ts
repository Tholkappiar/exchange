import { Router } from "express";
import { RedisManager } from "../redis/RedisManager";

export const orderRouter = Router();

orderRouter.post("/", async (req, res) => {
    const payload = req.body;
    const userID = req.userData.userId;
    const instance = await RedisManager.getInstance();

    payload.data.userID = userID;

    const response = await instance.sendAndAwait(payload);
    res.json(response);
});
