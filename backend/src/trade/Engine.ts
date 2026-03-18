import { BalanceManager } from "./BalanceManager";
import { MarketRegistry } from "./MarketRegistry";
import { Order, ORDER_STATUS } from "./OrderBook";

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

    process(request: EngineRequest): EngineResponse {
        switch (request.type) {
            case "CREATE_ORDER":
                return this.createOrder(request.data);
            case "CANCEL_ORDER":
                return this.cancelOrder(request.data);
            case "GET_OPEN_ORDERS":
                return this.getOpenOrders(request.data);
            case "GET_DEPTH":
                return this.getDepth(request.data);
        }
    }

    private createOrder(order: CreateOrderPayload): EngineResponse {
        const { baseAsset, quoteAsset } = order;
        const ticker = `${baseAsset}_${quoteAsset}`;

        const book = this.marketRegistry.getBook(ticker);
        if (!book) {
            return { success: false, error: `Market ${ticker} does not exist` };
        }

        const locked = this.balanceManager.lockBalance(order);
        if (!locked) {
            // return { success: false, error: "Insufficient balance" };
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

export const ENGINE_REQUEST_TYPE = {
    CREATE_ORDER: "CREATE_ORDER",
    CANCEL_ORDER: "CANCEL_ORDER",
    GET_OPEN_ORDERS: "GET_OPEN_ORDERS",
    GET_DEPTH: "GET_DEPTH",
} as const;

export type EngineRequestType =
    (typeof ENGINE_REQUEST_TYPE)[keyof typeof ENGINE_REQUEST_TYPE];

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

export type EngineRequest =
    | { id: string; type: "CREATE_ORDER"; data: CreateOrderPayload }
    | { id: string; type: "CANCEL_ORDER"; data: CancelOrderPayload }
    | { id: string; type: "GET_OPEN_ORDERS"; data: GetOpenOrdersPayload }
    | { id: string; type: "GET_DEPTH"; data: GetDepthPayload };

export type EngineResponse<T = unknown> =
    | { success: true; data: T }
    | { success: false; error: string };
