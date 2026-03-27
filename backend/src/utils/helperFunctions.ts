import { clerkClient, getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { prisma } from "./prismaClient";

// Todo: this check happens everytime - find a way to fix this or is this okay ?
export async function createUserIfNotExist(
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
