export type order_type = {
    id: string,
    type: "limit" | "market" | "ioc"
    side: "bid" | "ask",
    quantity: number,
    price: number,
    timestamp: number,
    symbol: string
}   

export interface trade_book_type {
    asks: order_type[],
    bids: order_type[]
}

export const CONSTANTS = {
    BID: "bid",
    ASK: "ask"
}

type filled_type = {
    order_id: string;
    quantity: number
    side: "ask" | "bid"
}

export interface filled_book_type {
    asks: filled_type[],
    bids: filled_type[]
}