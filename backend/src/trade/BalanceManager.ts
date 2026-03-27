import { Order } from "./OrderBook";

export class BalanceManager {
    private static instance: BalanceManager | null = null;

    private balances: Map<string, Map<string, Balance>> = new Map();

    static getInstance(): BalanceManager {
        if (!BalanceManager.instance) {
            BalanceManager.instance = new BalanceManager();
        }
        return BalanceManager.instance;
    }

    validateBalance(order: Order): boolean {
        const {
            userID,
            side,
            orderType,
            price,
            quantity,
            baseAsset,
            quoteAsset,
        } = order;

        if (side === "ASK") {
            // selling base asset — check free base balance
            const baseBalance = this.getBalance(userID, baseAsset);
            return !!baseBalance && baseBalance.free >= quantity;
        }

        // BID cases
        if (orderType === "Market" && price && !quantity) {
            // market buy by quote amount (spend X USDT)
            const quoteBalance = this.getBalance(userID, quoteAsset);
            return !!quoteBalance && quoteBalance.free >= price;
        }

        if (orderType === "Market" && quantity && !price) {
            // market buy by quantity — we don't know cost yet (no price)
            // just check they have any balance at all, matching will handle the rest
            const quoteBalance = this.getBalance(userID, quoteAsset);
            return !!quoteBalance && quoteBalance.free > 0;
        }

        // limit BID — worst case cost is price * quantity
        if (!price) return false;
        const cost = price * quantity;
        const quoteBalance = this.getBalance(userID, quoteAsset);
        return !!quoteBalance && quoteBalance.free >= cost;
    }

    lockBalance(order: Order): boolean {
        if (!this.validateBalance(order)) return false;

        const {
            userID,
            side,
            orderType,
            price,
            quantity,
            baseAsset,
            quoteAsset,
        } = order;

        if (side === "ASK") {
            const baseBalance = this.getBalance(userID, baseAsset)!;
            baseBalance.free -= quantity;
            baseBalance.locked += quantity;
            return true;
        }

        if (orderType === "Market" && price && !quantity) {
            const quoteBalance = this.getBalance(userID, quoteAsset)!;
            quoteBalance.free -= price;
            quoteBalance.locked += price;
            return true;
        }

        const worstCaseCost = price! * quantity;
        const quoteBalance = this.getBalance(userID, quoteAsset)!;
        quoteBalance.free -= worstCaseCost;
        quoteBalance.locked += worstCaseCost;
        return true;
    }

    unlockBalance(order: Order, remainingQty: number): boolean {
        const { userID, side, orderType, price, baseAsset, quoteAsset } = order;

        if (side === "ASK") {
            const baseBalance = this.getBalance(userID, baseAsset);
            if (!baseBalance) return false;
            baseBalance.locked -= remainingQty;
            baseBalance.free += remainingQty;
            return true;
        }

        if (orderType === "Market" && price && !order.quantity) {
            const quoteBalance = this.getBalance(userID, quoteAsset);
            if (!quoteBalance) return false;
            quoteBalance.locked -= remainingQty;
            quoteBalance.free += remainingQty;
            return true;
        }

        const refund = price! * remainingQty;
        const quoteBalance = this.getBalance(userID, quoteAsset);
        if (!quoteBalance) return false;
        quoteBalance.locked -= refund;
        quoteBalance.free += refund;
        return true;
    }

    transferBalance(
        buyerID: string,
        sellerID: string,
        qty: number,
        price: number,
        baseAsset: string,
        quoteAsset: string,
    ): boolean {
        const cost = qty * price;

        const buyerQuote = this.getBalance(buyerID, quoteAsset);
        const buyerBase = this.getBalance(buyerID, baseAsset);
        const sellerBase = this.getBalance(sellerID, baseAsset);
        const sellerQuote = this.getBalance(sellerID, quoteAsset);

        if (!buyerQuote || !buyerBase || !sellerBase || !sellerQuote)
            return false;

        buyerQuote.locked -= cost;
        buyerBase.free += qty;

        sellerBase.locked -= qty;
        sellerQuote.free += cost;

        return true;
    }

    getBalance(userID: string, assetID: string): Balance | undefined {
        return this.balances.get(userID)?.get(assetID);
    }

    addUserBalance(
        userID: string,
        assetID: string,
        defaultBalance = 1000,
    ): void {
        if (!this.balances.has(userID)) {
            this.balances.set(userID, new Map());
        }
        if (!this.balances.get(userID)!.has(assetID)) {
            this.balances.get(userID)!.set(assetID, {
                free: defaultBalance,
                locked: 0,
            });
        }
    }
}

// types

export type Balance = {
    free: number;
    locked: number;
};
