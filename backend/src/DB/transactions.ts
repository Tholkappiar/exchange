import { BroadcastDataToRedis } from "../trade/Engine";
import { Order } from "../trade/OrderBook";
import { prisma } from "../utils/prismaClient";

export async function DbOrderCreation(
    order: Order,
    result: BroadcastDataToRedis,
) {
    await prisma.$transaction(async (tx) => {
        // insert order
        await tx.order.create({
            data: {
                id: order.orderID,
                userID: order.userID,
                ticker: `${order.baseAsset}_${order.quoteAsset}`,
                side: order.side as any,
                orderType: order.orderType.toUpperCase() as any,
                price: order.price,
                quantity: order.quantity,
                remaining: result.remainingQuantity,
                status: result.status as any,
                createdAt: new Date(order.createdAt),
                updatedAt: new Date(),
            },
        });

        // insert fills + update balances
        for (const fill of result.fills) {
            const buyerID =
                order.side === "BID" ? order.userID : fill.oppositeUserId;
            const sellerID =
                order.side === "ASK" ? order.userID : fill.oppositeUserId;
            const cost = fill.executedQuantity * fill.price;

            // insert fill
            await tx.fill.create({
                data: {
                    ticker: fill.ticker,
                    price: fill.price,
                    quantity: fill.executedQuantity,
                    side: fill.side as any,
                    makerID: sellerID,
                    takerID: buyerID,
                    createdAt: new Date(),
                },
            });

            // update buyer: deduct quote, add base
            await tx.balance.updateMany({
                where: { userID: buyerID, asset: order.quoteAsset },
                data: { locked: { decrement: cost }, updatedAt: new Date() },
            });
            await tx.balance.updateMany({
                where: { userID: buyerID, asset: order.baseAsset },
                data: {
                    free: { increment: fill.executedQuantity },
                    updatedAt: new Date(),
                },
            });

            // update seller: deduct base, add quote
            await tx.balance.updateMany({
                where: { userID: sellerID, asset: order.baseAsset },
                data: {
                    locked: { decrement: fill.executedQuantity },
                    updatedAt: new Date(),
                },
            });
            await tx.balance.updateMany({
                where: { userID: sellerID, asset: order.quoteAsset },
                data: { free: { increment: cost }, updatedAt: new Date() },
            });

            // ledger entries
            await tx.balanceLedger.createMany({
                data: [
                    {
                        userID: buyerID,
                        asset: order.baseAsset,
                        amount: fill.executedQuantity,
                        reason: "ORDER_FILL",
                        referenceID: order.orderID,
                        createdAt: new Date(),
                    },
                    {
                        userID: sellerID,
                        asset: order.quoteAsset,
                        amount: cost,
                        reason: "ORDER_FILL",
                        referenceID: order.orderID,
                        createdAt: new Date(),
                    },
                ],
            });
        }
    });
}

export async function DbOrderCancel(
    orderID: string,
    userID: string,
    asset: string,
    cancelledQuantity: number,
    price: number,
) {
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: orderID },
            data: {
                status: "CANCELLED",
                remaining: 0,
                updatedAt: new Date(),
            },
        });

        const refund = cancelledQuantity * price;

        await tx.balance.update({
            where: { userID_asset: { userID, asset } },
            data: {
                locked: {
                    decrement: refund,
                },
                free: {
                    increment: refund,
                },
            },
        });

        await tx.balanceLedger.create({
            data: {
                userID,
                asset,
                amount: refund,
                reason: "UNLOCK",
                referenceID: orderID,
                createdAt: new Date(),
            },
        });
    });
}
