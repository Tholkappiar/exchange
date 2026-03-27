import { getTickerSchema } from "../zod/MarketRegistrySchema";
import { EngineResponse } from "./Engine";
import { OrderBook } from "./OrderBook";

export class MarketRegistry {
    private static instance: MarketRegistry | null = null;

    private books: Map<string, OrderBook> = new Map();

    private constructor() {}

    static getInstance(): MarketRegistry {
        if (!MarketRegistry.instance) {
            MarketRegistry.instance = new MarketRegistry();
        }
        return MarketRegistry.instance;
    }

    createMarket(baseAsset: string, quoteAsset: string): OrderBook {
        const ticker = `${baseAsset.toUpperCase()}_${quoteAsset.toUpperCase()}`;

        if (this.books.has(ticker)) {
            return this.books.get(ticker)!;
        }

        const book = new OrderBook(
            baseAsset.toUpperCase(),
            quoteAsset.toUpperCase(),
        );
        this.books.set(ticker, book);
        console.log(`[MarketRegistry] Created market: ${ticker}`);
        return book;
    }

    getBook(ticker: string): OrderBook | undefined {
        return this.books.get(ticker.toUpperCase());
    }

    hasMarket(ticker: string): boolean {
        return this.books.has(ticker.toUpperCase());
    }

    getAllTickers() {
        return Array.from(this.books.entries()).map(([key, book]) => ({
            ticker: key,
            ...book.getTickerData(),
        }));
    }

    getTicker(symbol: string) {
        const result = getTickerSchema.safeParse(symbol);
        if (!result.success) {
            return {
                success: false,
                error: result.error,
            };
        }
        return this.books.get(symbol);
    }

    resetMarket(baseAsset: string, quoteAsset: string): EngineResponse {
        const book = this.books.get(`${baseAsset}_${quoteAsset}`);
        if (!book) {
            return { success: false, error: "Book not found." };
        }
        book?.resetBook();
        return { success: true, data: "Book Data cleared" };
    }
}
