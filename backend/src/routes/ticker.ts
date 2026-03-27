import { Router } from "express";
import { MarketRegistry } from "../trade/MarketRegistry";

export const TickerRouter = Router();

TickerRouter.get("/", async (req, res) => {
    const response = MarketRegistry.getInstance().getAllTickers();
    res.json(response);
});

TickerRouter.get("/:ticker", async (req, res) => {
    const { ticker } = req.params;
    const response = MarketRegistry.getInstance().getTicker(ticker);
    res.json(response);
});
