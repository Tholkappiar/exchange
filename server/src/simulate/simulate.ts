import { randomUUID } from "crypto";
import { order_type } from "../types/trade_book";
import { OrderBook } from "../calculations/order_book";

const SYMBOL = "BTC-USD";

function createOrder(partial: Omit<order_type, "id" | "timestamp">): order_type {
    return {
        id: randomUUID(),
        timestamp: Date.now(),
        ...partial,
    };
}

function printBook(book: OrderBook) {
    const ob = book.get_order_book();

    console.log("Current order book");
    console.log("BIDS (buy side, highest price first)");
    console.table(
        ob.bids.map(b => ({
            price: b.price,
            quantity: b.quantity,
            side: b.side,
            symbol: b.symbol,
        }))
    );

    console.log("ASKS (sell side, lowest price first)");
    console.table(
        ob.asks.map(a => ({
            price: a.price,
            quantity: a.quantity,
            side: a.side,
            symbol: a.symbol,
        }))
    );
}

function main() {
    const book = new OrderBook();

    const orders: order_type[] = [
        // Seed some bids
        createOrder({ type: "limit", side: "bid",  price: 100, quantity: 5, symbol: SYMBOL }),
        createOrder({ type: "limit", side: "bid",  price: 99,  quantity: 3, symbol: SYMBOL }),
        // Seed some asks
        createOrder({ type: "limit", side: "ask", price: 105, quantity: 4, symbol: SYMBOL }),
        createOrder({ type: "limit", side: "ask", price: 106, quantity: 2, symbol: SYMBOL }),

        // Now send an aggressive bid that should match some asks
        createOrder({ type: "limit", side: "bid",  price: 106, quantity: 5, symbol: SYMBOL }),

        // Send an aggressive ask that should match some bids
        createOrder({ type: "limit", side: "ask", price: 99,  quantity: 6, symbol: SYMBOL }),

        // IOC example that should fully fill
        createOrder({ type: "ioc",   side: "bid",  price: 105, quantity: 2, symbol: SYMBOL }),

        // IOC example that should fail (not enough liquidity)
        createOrder({ type: "ioc",   side: "ask", price: 110, quantity: 10, symbol: SYMBOL }),
    ];

    orders.forEach((order, idx) => {
        console.log("==================================================");
        console.log(`Step ${idx + 1}`);
        console.log("Incoming order:");
        console.log(order);

        const ok = book.process_order(order);

        console.log("Result:", ok ? "ACCEPTED" : "REJECTED (IOC not fully fillable)");
        printBook(book);
    });

    console.log("==================================================");
    console.log("Final book state");
    printBook(book);
}

main();
