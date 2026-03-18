import { ORDER_SIDE } from "../utils/constants";

export class OrderBook {
    private baseAsset: string;
    private quoteAsset: string;

    private bids: Order[] = [];
    private asks: Order[] = [];

    private bidDepth: Map<number, number> = new Map();
    private askDepth: Map<number, number> = new Map();

    currentPrice = 0;

    constructor(baseAsset: string, quoteAsset: string) {
        this.baseAsset = baseAsset;
        this.quoteAsset = quoteAsset;
    }

    getTicker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    getBaseAsset() {
        return this.baseAsset;
    }

    getQuoteAsset() {
        return this.quoteAsset;
    }

    addOrder(order: Order) {
        order = {
            ...order,
            remaining: order.quantity,
        };

        const fills =
            order.side === ORDER_SIDE.ASK
                ? this.matchAsk(order)
                : this.matchBid(order);

        // only LIMIT orders can rest in the book
        if (order.remaining > 0 && order.orderType === "Limit") {
            this.insertOrder(order);
        }

        const totalExecutedQuantity = fills.reduce(
            (sum, f) => sum + f.executedQuantity,
            0,
        );

        let status: OrderStatus;
        let reason: OrderReason | undefined;

        if (fills.length === 0) {
            if (order.orderType === "Market") {
                status = ORDER_STATUS.REJECTED;
                reason = ORDER_REASON.NO_LIQUIDITY;
            } else {
                status = ORDER_STATUS.OPEN;
                reason = ORDER_REASON.PRICE_NOT_MATCHED;
            }
        } else if (order.remaining === 0) {
            status = ORDER_STATUS.FILLED;
        } else {
            status = ORDER_STATUS.PARTIALLY_FILLED;
            reason = ORDER_REASON.INSUFFICIENT_LIQUIDITY;
        }

        return {
            totalExecutedQuantity,
            remainingQuantity: order.remaining,
            status,
            reason,
            fills,
        };
    }

    private matchAsk(order: Order): Fills[] {
        const fills: Fills[] = [];

        while (
            order.remaining > 0 &&
            this.bids.length > 0 &&
            this.bids[0].price !== undefined &&
            (order.orderType === "Market" || this.bids[0].price >= order.price!)
        ) {
            const bestBid = this.bids[0];

            const tradeQty = Math.min(order.remaining, bestBid.remaining);

            order.remaining -= tradeQty;
            bestBid.remaining -= tradeQty;

            this.currentPrice = bestBid.price!;

            fills.push({
                clientId: "",
                createdAt: "",
                executedQuantity: tradeQty,
                id: "",
                oppositeUserId: bestBid.userID,
                orderType: order.orderType,
                price: this.currentPrice,
                side: order.side,
                ticker: this.getTicker(),
                baseAsset: order.baseAsset,
                quoteAsset: order.quoteAsset,
            });

            if (bestBid.remaining === 0) {
                this.bids.shift();
            }

            this.updateDepth(this.bidDepth, bestBid.price!, -tradeQty);
        }

        return fills;
    }

    private matchBid(order: Order): Fills[] {
        const fills: Fills[] = [];

        // MARKET order by quantity
        if (order.orderType === "Market" && order.quantity) {
            while (order.remaining > 0 && this.asks.length > 0) {
                const bestAsk = this.asks[0];

                const tradeQty = Math.min(order.remaining, bestAsk.remaining);

                order.remaining -= tradeQty;
                bestAsk.remaining -= tradeQty;

                this.currentPrice = bestAsk.price!;

                fills.push({
                    clientId: "",
                    createdAt: "",
                    executedQuantity: tradeQty,
                    id: "",
                    oppositeUserId: bestAsk.userID,
                    orderType: order.orderType,
                    price: this.currentPrice,
                    side: order.side,
                    ticker: this.getTicker(),
                    baseAsset: order.baseAsset,
                    quoteAsset: order.quoteAsset,
                });

                if (bestAsk.remaining === 0) {
                    this.asks.shift();
                }

                this.updateDepth(this.askDepth, bestAsk.price!, -tradeQty);
            }

            return fills;
        }

        // MARKET order by quote amount (spend quote currency)
        if (order.orderType === "Market" && order.price) {
            let remainingQuote = order.price;

            while (remainingQuote > 0 && this.asks.length > 0) {
                const bestAsk = this.asks[0];

                const maxCost = bestAsk.price! * bestAsk.remaining;

                let tradeQty: number;

                if (remainingQuote >= maxCost) {
                    tradeQty = bestAsk.remaining;
                } else {
                    tradeQty = remainingQuote / bestAsk.price!;
                }

                remainingQuote -= tradeQty * bestAsk.price!;

                bestAsk.remaining -= tradeQty;
                order.remaining -= tradeQty;
                this.currentPrice = bestAsk.price!;

                fills.push({
                    clientId: "",
                    createdAt: "",
                    executedQuantity: tradeQty,
                    id: "",
                    oppositeUserId: bestAsk.userID,
                    orderType: order.orderType,
                    price: this.currentPrice,
                    side: order.side,
                    ticker: this.getTicker(),
                    baseAsset: order.baseAsset,
                    quoteAsset: order.quoteAsset,
                });

                if (bestAsk.remaining === 0) {
                    this.asks.shift();
                }

                this.updateDepth(this.askDepth, bestAsk.price!, -tradeQty);
            }

            return fills;
        }

        // LIMIT order
        while (
            order.remaining > 0 &&
            this.asks.length > 0 &&
            this.asks[0].price !== undefined &&
            this.asks[0].price <= order.price!
        ) {
            const bestAsk = this.asks[0];

            const tradeQty = Math.min(order.remaining, bestAsk.remaining);

            order.remaining -= tradeQty;
            bestAsk.remaining -= tradeQty;

            this.currentPrice = bestAsk.price!;

            fills.push({
                clientId: "",
                createdAt: "",
                executedQuantity: tradeQty,
                id: "",
                oppositeUserId: bestAsk.userID,
                orderType: order.orderType,
                price: this.currentPrice,
                side: order.side,
                ticker: this.getTicker(),
                baseAsset: order.baseAsset,
                quoteAsset: order.quoteAsset,
            });

            this.updateDepth(this.askDepth, bestAsk.price!, -tradeQty);

            if (bestAsk.remaining === 0) {
                this.asks.shift();
            }
        }

        return fills;
    }

    private insertOrder(order: Order) {
        if (order.side === ORDER_SIDE.ASK) {
            this.asks.push(order);
            this.asks.sort((a, b) => {
                if (a.price! !== b.price!) return a.price! - b.price!; // lowest ask first
                return a.createdAt - b.createdAt;
            });
            this.updateDepth(this.askDepth, order.price!, order.remaining);
        } else {
            this.bids.push(order);
            this.bids.sort((a, b) => {
                if (b.price! !== a.price!) return b.price! - a.price!; // highest bid first
                return a.createdAt - b.createdAt;
            });
            this.updateDepth(this.bidDepth, order.price!, order.remaining);
        }
    }

    cancelBid(orderID: string, userID: string) {
        const index = this.bids.findIndex(
            (bid) => bid.orderID === orderID && bid.userID === userID,
        );
        if (index === -1) {
            return { success: false, reason: ORDER_REASON.ORDER_NOT_FOUND };
        }
        const [removedOrder] = this.bids.splice(index, 1);
        this.updateDepth(
            this.bidDepth,
            removedOrder.price!,
            -removedOrder.remaining,
        );
        return {
            success: true,
            cancelledQuantity: removedOrder.remaining,
            order: removedOrder,
        };
    }

    cancelAsk(orderID: string, userID: string) {
        const index = this.asks.findIndex(
            (o) => o.orderID === orderID && o.userID === userID,
        );
        if (index === -1) {
            return { success: false, reason: ORDER_REASON.ORDER_NOT_FOUND };
        }
        const [removedOrder] = this.asks.splice(index, 1);
        this.updateDepth(
            this.askDepth,
            removedOrder.price!,
            -removedOrder.remaining,
        );
        return {
            success: true,
            cancelledQuantity: removedOrder.remaining,
            order: removedOrder,
        };
    }

    getOpenOrders(userID: string) {
        const openBids = this.bids.filter((bid) => bid.userID === userID);
        const openAsks = this.asks.filter((ask) => ask.userID === userID);
        return { openAsks, openBids };
    }

    updateDepth(map: Map<number, number>, price: number, quantity: number) {
        map.set(price, (map.get(price) || 0) + quantity);
        if (map.get(price)! <= 0) {
            map.delete(price);
        }
    }

    getDepth(limit = 100) {
        const bids = Array.from(this.bidDepth.entries())
            .sort((a, b) => b[0] - a[0]) // high → low
            .slice(0, limit)
            .map(([price, qty]) => [price.toString(), qty.toString()]);

        const asks = Array.from(this.askDepth.entries())
            .sort((a, b) => a[0] - b[0]) // low → high
            .slice(0, limit)
            .map(([price, qty]) => [price.toString(), qty.toString()]);

        return { bids, asks };
    }

    getBestBid() {
        return this.bids[0];
    }
    getBidsLength() {
        return this.bids.length;
    }
    getBestAsk() {
        return this.asks[0];
    }
    getAsksLength() {
        return this.asks.length;
    }
}

export type Order = {
    orderType: "Market" | "Limit";
    price?: number;
    baseAsset: string;
    quoteAsset: string;
    side: "BID" | "ASK";
    userID: string;
    orderID: string;
    quantity: number;
    remaining: number;
    createdAt: number;
};

export type Fills = {
    orderType: string;
    id: string;
    clientId: string;
    createdAt: string;
    executedQuantity: number;
    side: string;
    price: number;
    oppositeUserId: string;
    ticker: string;
    baseAsset: string;
    quoteAsset: string;
};

export const ORDER_STATUS = {
    OPEN: "OPEN",
    PARTIALLY_FILLED: "PARTIALLY_FILLED",
    FILLED: "FILLED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_REASON = {
    NO_LIQUIDITY: "NO_LIQUIDITY",
    PRICE_NOT_MATCHED: "PRICE_NOT_MATCHED",
    INSUFFICIENT_LIQUIDITY: "INSUFFICIENT_LIQUIDITY",
    INVALID_ORDER: "INVALID_ORDER",
    ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
} as const;

export type OrderReason = (typeof ORDER_REASON)[keyof typeof ORDER_REASON];
