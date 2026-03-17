import { OrderBook } from "./OrderBook";

export class MarketRegistry {
    private static instance: MarketRegistry | null = null;
    private books = new Map<string, OrderBook>();

    static getInstance() {
        if (!MarketRegistry.instance) {
            MarketRegistry.instance = new MarketRegistry();
        }
        return MarketRegistry.instance;
    }

    private constructor() {}

    createMarket(baseAsset: string, quoteAsset: string) {
        const ticker = `${baseAsset}_${quoteAsset}`;
        if (this.books.has(ticker)) {
            throw new Error("market exists, duplicate market");
        }
        this.books.set(ticker, new OrderBook(baseAsset, quoteAsset));
    }

    getBook(symbol: string) {
        const book = this.books.get(symbol);
        if (!book) {
            throw new Error("Market not found");
        }
        return book;
    }
}
