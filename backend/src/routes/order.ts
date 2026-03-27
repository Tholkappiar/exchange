import { NextFunction, Request, Response, Router } from "express";
import { MarketRegistry } from "../trade/MarketRegistry";
import { RedisManager } from "../redis/RedisManager";
import { clerkClient, getAuth, requireAuth } from "@clerk/express";
import { prisma } from "../utils/prismaClient";

export const orderRouter = Router();

orderRouter.use(requireAuth());
orderRouter.use(createUserIfNotExist);

// Todo: this check happens everytime - find a way to fix this or is this okay ?
async function createUserIfNotExist(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await prisma.user.findFirst({ where: { id: userId } });
        if (!user) {
            const email =
                (await clerkClient.users.getUser(userId)).emailAddresses[0]
                    .emailAddress || undefined;
            await prisma.user.create({
                data: {
                    id: userId,
                    email,
                    createdAt: new Date(),
                },
            });
        }

        req.userData = {
            userId,
        };

        next();
    } catch (err) {
        console.error("User sync failed:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

orderRouter.post("/order", async (req, res) => {
    const payload = req.body;
    const userID = req.userData.userId;
    const instance = await RedisManager.getInstance();
    payload.data.userID = userID;
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

orderRouter.get("/users", async (req, res) => {
    const s = getAuth(req);
    res.send(s);
});
