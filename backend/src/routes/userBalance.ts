import { Router } from "express";
import { BalanceManager } from "../trade/BalanceManager";
import {
    getBalanceSchema,
    setBalanceSchema,
} from "../zod/UserBalanceApiSchema";
import { ORDER_REASON } from "../trade/OrderBook";

export const UserBalanceRouter = Router();

UserBalanceRouter.get("/", async (req, res) => {
    const userID = req.userData.userId;
    console.log("req.query : ", req.query);
    const parseResult = getBalanceSchema.safeParse(req.query);
    if (!parseResult.success) {
        return res.json(parseResult);
    }
    const response = BalanceManager.getInstance().getBalance(
        userID,
        parseResult.data.asset.trim(),
    );
    if (!response) {
        return res.json({
            success: false,
            message: ORDER_REASON.NO_ASSET_FOUND,
        });
    }

    res.json(response);
});

UserBalanceRouter.post("/", async (req, res) => {
    const userID = req.userData.userId;
    const payload = req.body;
    const parseResult = setBalanceSchema.safeParse(payload);
    if (!parseResult.success) {
        return res.json(parseResult);
    }
    BalanceManager.getInstance().addUserBalance(
        userID,
        payload.asset.trim(),
        payload.amount,
    );

    res.json({
        success: true,
        message: ORDER_REASON.BALANCE_ADDED,
    });
});
