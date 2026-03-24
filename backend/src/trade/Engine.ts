import { BalanceManager } from "./BalanceManager";
import { MarketRegistry } from "./MarketRegistry";
import { Order, ORDER_STATUS } from "./OrderBook";
import { EngineRequestSchema } from "../zod/EngineSchema";
import { ORDER_TYPES } from "../utils/constants";
import { RedisManager } from "../redis/RedisManager";

export class Engine {
    private static instance: Engine | null = null;

    private balanceManager = BalanceManager.getInstance();
    private marketRegistry = MarketRegistry.getInstance();

    private constructor() {}

    static getInstance(): Engine {
        if (!Engine.instance) {
            Engine.instance = new Engine();
        }
        return Engine.instance;
    }

    process(request: unknown): EngineResponse | Promise<EngineResponse> {
        const result = EngineRequestSchema.safeParse(request);
        if (!result.success) {
            return {
                success: false,
                error: result.error.issues
                    .map((i) => `${i.path.join(".")}: ${i.message}`)
                    .join(", "),
            };
        }

        const validated = result.data;

        switch (validated.type) {
            case ORDER_TYPES.CREATE_ORDER:
                return this.createOrder(validated.data);
            case ORDER_TYPES.CANCEL_ORDER:
                return this.cancelOrder(validated.data);
            case ORDER_TYPES.GET_OPEN_ORDERS:
                return this.getOpenOrders(validated.data);
            case ORDER_TYPES.GET_DEPTH:
                return this.getDepth(validated.data);
            /// todo: reset feature should be removed in the end
            case ORDER_TYPES.RESET_BOOK:
                return this.marketRegistry.resetMarket(
                    validated.data.baseAsset,
                    validated.data.quoteAsset,
                );
        }
    }

    private async createOrder(
        order: CreateOrderPayload,
    ): Promise<EngineResponse> {
        const { baseAsset, quoteAsset } = order;
        const ticker = `${baseAsset}_${quoteAsset}`;

        const book = this.marketRegistry.getBook(ticker);
        if (!book) {
            return { success: false, error: `Market ${ticker} does not exist` };
        }

        const locked = this.balanceManager.lockBalance(order);
        if (!locked) {
            this.balanceManager.addUserBalance(order.userID, order.baseAsset);
        }

        const result = book.addOrder(order);

        for (const fill of result.fills) {
            const buyerID =
                order.side === "BID" ? order.userID : fill.oppositeUserId;
            const sellerID =
                order.side === "ASK" ? order.userID : fill.oppositeUserId;

            this.balanceManager.transferBalance(
                buyerID,
                sellerID,
                fill.executedQuantity,
                fill.price,
                baseAsset,
                quoteAsset,
            );
        }

        const needsRefund =
            result.status === ORDER_STATUS.OPEN ||
            result.status === ORDER_STATUS.PARTIALLY_FILLED ||
            result.status === ORDER_STATUS.REJECTED;

        if (needsRefund && result.remainingQuantity > 0) {
            this.balanceManager.unlockBalance(order, result.remainingQuantity);
        }

        // publish depths
        if (
            result.depthDiff.bids.length > 0 ||
            result.depthDiff.asks.length > 0
        ) {
            (await RedisManager.getInstance()).publishMessage(
                `depth@${ticker}`,
                result.depthDiff,
            );
        }

        // publish trades
        const liveFills = result.fills.filter((f) => f.executedQuantity > 0);
        if (liveFills.length > 0) {
            (await RedisManager.getInstance()).publishMessage(
                `trades@${ticker}`,
                JSON.stringify(liveFills),
            );
        }

        return { success: true, data: result };
    }

    private cancelOrder(payload: CancelOrderPayload): EngineResponse {
        const book = this.marketRegistry.getBook(payload.ticker);
        if (!book) {
            return {
                success: false,
                error: `Market ${payload.ticker} does not exist`,
            };
        }

        const cancelResult =
            payload.side === "BID"
                ? book.cancelBid(payload.orderID, payload.userID)
                : book.cancelAsk(payload.orderID, payload.userID);

        if (!cancelResult.success) {
            return { success: false, error: "Order not found" };
        }

        const { order, cancelledQuantity } = cancelResult as {
            success: true;
            cancelledQuantity: number;
            order: CreateOrderPayload;
        };

        this.balanceManager.unlockBalance(order, cancelledQuantity);

        return {
            success: true,
            data: { cancelledQuantity },
        };
    }

    private getOpenOrders(payload: GetOpenOrdersPayload): EngineResponse {
        console.log("pay : ", payload);
        const book = this.marketRegistry.getBook(payload.ticker);
        if (!book) {
            return {
                success: false,
                error: `Market ${payload.ticker} does not exist`,
            };
        }

        return {
            success: true,
            data: book.getOpenOrders(payload.userID),
        };
    }

    private getDepth(payload: GetDepthPayload): EngineResponse {
        const book = this.marketRegistry.getBook(payload.ticker);
        if (!book) {
            return {
                success: false,
                error: `Market ${payload.ticker} does not exist`,
            };
        }

        return {
            success: true,
            data: book.getDepth(payload.limit),
        };
    }
}

export type CreateOrderPayload = Order;

export type CancelOrderPayload = {
    orderID: string;
    userID: string;
    side: "BID" | "ASK";
    ticker: string;
};

export type GetOpenOrdersPayload = {
    userID: string;
    ticker: string;
};

export type GetDepthPayload = {
    ticker: string;
    limit?: number;
};

export type ResetBookPayload = {
    baseAsset: string;
    quoteAsset: string;
};

export type EngineRequest =
    | { id: string; type: "CREATE_ORDER"; data: CreateOrderPayload }
    | { id: string; type: "CANCEL_ORDER"; data: CancelOrderPayload }
    | { id: string; type: "GET_OPEN_ORDERS"; data: GetOpenOrdersPayload }
    | { id: string; type: "GET_DEPTH"; data: GetDepthPayload }
    | { id: string; type: "RESET_BOOK"; data: ResetBookPayload };

export type EngineResponse<T = unknown> =
    | { success: true; data: T }
    | { success: false; error: string };
