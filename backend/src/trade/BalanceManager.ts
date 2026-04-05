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
        const { userID, side, price, quantity, baseAsset, quoteAsset } = order;

        if (side === "ASK") {
            const bal = this.getBalance(userID, baseAsset);
            return !!bal && bal.free >= quantity;
        }

        const cost = price * quantity;
        const bal = this.getBalance(userID, quoteAsset);
        return !!bal && bal.free >= cost;
    }

    lockBalance(order: Order): boolean {
        if (!this.validateBalance(order)) return false;
        const { userID, side, price, quantity, baseAsset, quoteAsset } = order;

        if (side === "ASK") {
            const bal = this.getBalance(userID, baseAsset)!;
            bal.free -= quantity;
            bal.locked += quantity;
            return true;
        }

        const cost = price * quantity;
        const bal = this.getBalance(userID, quoteAsset)!;
        bal.free -= cost;
        bal.locked += cost;
        return true;
    }

    unlockBalance(order: Order, remainingQty: number): boolean {
        const { userID, side, price, baseAsset, quoteAsset } = order;

        if (side === "ASK") {
            const bal = this.getBalance(userID, baseAsset);
            if (!bal) return false;
            bal.locked -= remainingQty;
            bal.free += remainingQty;
            return true;
        }

        const refund = price * remainingQty;
        const bal = this.getBalance(userID, quoteAsset);
        if (!bal) return false;
        bal.locked -= refund;
        bal.free += refund;
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

    addUserBalance(userID: string, assetID: string, balance = 1000): void {
        if (!this.balances.has(userID)) {
            this.balances.set(userID, new Map());
        }
        const userBalances = this.balances.get(userID)!;

        if (userBalances.has(assetID)) {
            userBalances.get(assetID)!.free += balance;
        } else {
            userBalances.set(assetID, { free: balance, locked: 0 });
        }
    }
}

// types

export type Balance = {
    free: number;
    locked: number;
};
