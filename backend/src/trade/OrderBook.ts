import { RedisManager } from "../redis/RedisManager";
import { ORDER_SIDE } from "../utils/constants";

// todo: should be renamed to Market
// todo: only use USDT to buy
export class OrderBook {
    private baseAsset: string;
    private quoteAsset: string;

    private bids: Order[] = [];
    private asks: Order[] = [];

    private bidDepth: Map<number, number> = new Map();
    private askDepth: Map<number, number> = new Map();

    // ticker states
    ticker: TickerState = {
        lastPrice: 0,
        open24h: 0,
        low24h: null,
        high24h: 0,
        volume24h: 0,
        priceChange: 0,
    };

    trades: TradesState = [];

    currentPrice = 0;
    sequence = 0;

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

    async addOrder(order: Order) {
        order = {
            ...order,
            remaining: order.quantity,
        };

        const changedBids = new Map<number, number>();
        const changedAsks = new Map<number, number>();

        const fills =
            order.side === ORDER_SIDE.ASK
                ? this.matchAsk(order, changedBids)
                : this.matchBid(order, changedAsks);

        // only LIMIT orders can rest in the book
        if (order.remaining > 0 && order.orderType === "Limit") {
            this.insertOrder(order);
        }

        const depthDiff = this.buildDepthDiff(changedAsks, changedBids);

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

        if (fills.length > 0) {
            for (const fill of fills) {
                await this.tickerChange(fill.price, fill.executedQuantity);
            }
        }

        return {
            totalExecutedQuantity,
            remainingQuantity: order.remaining,
            status,
            reason,
            fills,
            depthDiff,
            orderID: order.orderID
        };
    }

    // tickerChange — clean version
    private async tickerChange(price: number, quantity: number) {
        const now = Date.now();
        const cutoff = now - 24 * 60 * 60 * 1000;

        this.trades.push({ price, quantity, timestamp: now });

        while (this.trades.length > 0 && this.trades[0].timestamp < cutoff) {
            this.trades.shift();
        }

        const trades = this.trades;

        this.ticker.lastPrice = price;
        this.ticker.open24h = trades[0]?.price ?? price;
        this.ticker.high24h = Math.max(...trades.map((t) => t.price));
        this.ticker.low24h =
            trades.length > 0 ? Math.min(...trades.map((t) => t.price)) : null;
        this.ticker.volume24h = trades.reduce((sum, t) => sum + t.quantity, 0);
        this.ticker.priceChange =
            this.ticker.open24h > 0
                ? ((price - this.ticker.open24h) / this.ticker.open24h) * 100
                : 0;

        const redisData = {
            lastPrice: this.ticker.lastPrice,
            open24h: this.ticker.open24h,
            low24h: this.ticker.low24h,
            high24h: this.ticker.high24h,
            volume24h: this.ticker.volume24h,
            priceChange: this.ticker.priceChange,
        };

        (await RedisManager.getInstance()).publishMessage(
            `ticker@${this.getTicker()}`,
            redisData,
        );
    }

    private matchAsk(order: Order, changedBids: Map<number, number>): Fills[] {
        const fills: Fills[] = [];

        while (
            order.remaining > 0 &&
            this.bids.length > 0 &&
            (order.orderType === "Market" || this.bids[0].price >= order.price)
        ) {
            const bestBid = this.bids[0];
            const tradeQty = Math.min(order.remaining, bestBid.remaining);

            order.remaining -= tradeQty;
            bestBid.remaining -= tradeQty;
            this.currentPrice = bestBid.price;

            fills.push({
                clientId: "",
                createdAt: "",
                id: "",
                executedQuantity: tradeQty,
                oppositeUserId: bestBid.userID,
                orderType: order.orderType,
                price: this.currentPrice,
                side: order.side,
                ticker: this.getTicker(),
                baseAsset: order.baseAsset,
                quoteAsset: order.quoteAsset,
            });

            if (bestBid.remaining === 0) this.bids.shift();

            this.updateDepth(
                this.bidDepth,
                bestBid.price,
                -tradeQty,
                changedBids,
            );
        }

        return fills;
    }

    private matchBid(order: Order, changedAsks: Map<number, number>): Fills[] {
        const fills: Fills[] = [];

        const priceLimit =
            order.orderType === "Market" ? Infinity : order.price;

        while (
            order.remaining > 0 &&
            this.asks.length > 0 &&
            this.asks[0].price <= priceLimit
        ) {
            const bestAsk = this.asks[0];
            const tradeQty = Math.min(order.remaining, bestAsk.remaining);

            order.remaining -= tradeQty;
            bestAsk.remaining -= tradeQty;
            this.currentPrice = bestAsk.price;

            fills.push({
                clientId: "",
                createdAt: "",
                id: "",
                executedQuantity: tradeQty,
                oppositeUserId: bestAsk.userID,
                orderType: order.orderType,
                price: this.currentPrice,
                side: order.side,
                ticker: this.getTicker(),
                baseAsset: order.baseAsset,
                quoteAsset: order.quoteAsset,
            });

            if (bestAsk.remaining === 0) this.asks.shift();

            this.updateDepth(
                this.askDepth,
                bestAsk.price,
                -tradeQty,
                changedAsks,
            );
        }

        return fills;
    }

    private insertOrder(order: Order) {
        if (order.side === ORDER_SIDE.ASK) {
            this.asks.push(order);
            this.asks.sort((a, b) =>
                a.price !== b.price
                    ? a.price - b.price
                    : a.createdAt - b.createdAt,
            );
            this.updateDepth(this.askDepth, order.price, order.remaining);
        } else {
            this.bids.push(order);
            this.bids.sort((a, b) =>
                b.price !== a.price
                    ? b.price - a.price
                    : a.createdAt - b.createdAt,
            );
            this.updateDepth(this.bidDepth, order.price, order.remaining);
        }
    }

    cancelBid(orderID: string, userID: string) {
        const index = this.bids.findIndex(
            (b) => b.orderID === orderID && b.userID === userID,
        );
        if (index === -1)
            return { success: false, reason: ORDER_REASON.ORDER_NOT_FOUND };
        const [removed] = this.bids.splice(index, 1);
        this.updateDepth(this.bidDepth, removed.price, -removed.remaining);
        return {
            success: true,
            cancelledQuantity: removed.remaining,
            order: removed,
        };
    }

    cancelAsk(orderID: string, userID: string) {
        const index = this.asks.findIndex(
            (o) => o.orderID === orderID && o.userID === userID,
        );
        if (index === -1)
            return { success: false, reason: ORDER_REASON.ORDER_NOT_FOUND };
        const [removed] = this.asks.splice(index, 1);
        this.updateDepth(this.askDepth, removed.price, -removed.remaining);
        return {
            success: true,
            cancelledQuantity: removed.remaining,
            order: removed,
        };
    }

    resetBook() {
        this.asks = [];
        this.bids = [];

        this.askDepth.clear();
        this.bidDepth.clear();

        this.currentPrice = 0;
    }

    getOpenOrders(userID: string) {
        const openBids = this.bids.filter((bid) => bid.userID === userID);
        const openAsks = this.asks.filter((ask) => ask.userID === userID);
        return { openAsks, openBids };
    }

    updateDepth(
        map: Map<number, number>,
        price: number,
        quantity: number,
        changed?: Map<number, number>,
    ) {
        map.set(price, (map.get(price) || 0) + quantity);
        if (map.get(price)! == 0) {
            map.delete(price);
        }
        changed?.set(price, 1); // marking the price
    }

    /// todo: test and verify this
    private buildDepthDiff(
        changedAsks: Map<number, number>,
        changedBids: Map<number, number>,
    ) {
        return {
            ticker: this.getTicker(),
            sequence: ++this.sequence,
            bids: Array.from(changedBids.entries()).map(([price, _]) => [
                price.toString(),
                (this.bidDepth.get(price) ?? 0).toString(),
            ]),
            asks: Array.from(changedAsks.entries()).map(([price, _]) => [
                price.toString(),
                (this.askDepth.get(price) ?? 0).toString(),
            ]),
        };
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

    getTickerData() {
        return this.ticker;
    }
}

export type Order = {
    orderType: "Market" | "Limit";
    price: number;
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
    INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
    LOCK_FAILED: "LOCK_FAILED",
    BALANCE_ADDED: "BALANCE_ADDED",
    INVALID_ASSET: "INVALID_ASSET",
    NO_ASSET_FOUND: "NO_ASSET_FOUND",
} as const;

export type OrderReason = (typeof ORDER_REASON)[keyof typeof ORDER_REASON];

export type TickerState = {
    lastPrice: number;
    open24h: number;
    low24h: null | number;
    high24h: number;
    volume24h: number;
    priceChange: number;
};

export type TradesState = {
    price: number;
    quantity: number;
    timestamp: number;
}[];
