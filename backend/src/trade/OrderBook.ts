import { ORDER_SIDE } from "../utils/constants";

export class OrderBook {
    private baseAsset: string | null = null;
    private quoteAsset: string | null = null;

    private bids: Order[] = [];
    private asks: Order[] = [];

    currentPrice = 0;

    constructor(baseAsset: string, quoteAsset: string) {
        this.baseAsset = baseAsset;
        this.quoteAsset = quoteAsset;
    }

    getTicker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
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

        return {
            executedQuantity: order.quantity - order.remaining,
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
                symbol: order.symbol,
            });

            if (bestBid.remaining === 0) {
                this.bids.shift();
            }
        }

        return fills;
    }

    private matchBid(order: Order): Fills[] {
        const fills: Fills[] = [];

        // MARKET order by quantity
        if (order.orderType === "Market" && order.quantity > 0) {
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
                    symbol: order.symbol,
                });

                if (bestAsk.remaining === 0) {
                    this.asks.shift();
                }
            }

            return fills;
        }

        // MARKET order by quote amount (spend quote currency)
        if (order.orderType === "Market" && order.price) {
            let remainingQuote = order.price;

            while (remainingQuote > 0 && this.asks.length > 0) {
                const bestAsk = this.asks[0];

                const maxCost = bestAsk.price! * bestAsk.remaining;

                let tradeQty;

                if (remainingQuote >= maxCost) {
                    tradeQty = bestAsk.remaining;
                } else {
                    tradeQty = remainingQuote / bestAsk.price!;
                }

                remainingQuote -= tradeQty * bestAsk.price!;

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
                    symbol: order.symbol,
                });

                if (bestAsk.remaining === 0) {
                    this.asks.shift();
                }
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
                symbol: order.symbol,
            });

            if (bestAsk.remaining === 0) {
                this.asks.shift();
            }
        }

        return fills;
    }

    private insertOrder(order: Order) {
        if (order.side === ORDER_SIDE.ASK) {
            this.asks.push(order);

            // lowest ask first
            this.asks.sort((a, b) => {
                if (a.price! !== b.price!) return a.price! - b.price!;
                return a.createdAt! - b.createdAt!;
            });
        } else {
            this.bids.push(order);

            // highest bid first
            this.bids.sort((a, b) => {
                if (b.price! !== a.price!) return b.price! - a.price!;
                return a.createdAt! - b.createdAt!;
            });
        }
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

    removeFilled(side: "bid" | "ask") {
        side === "ask" ? this.asks.shift() : this.bids.shift();
    }
}

export type Order = {
    orderType: "Market" | "Limit";
    price?: number;
    symbol: string;
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
    symbol: string;
};
