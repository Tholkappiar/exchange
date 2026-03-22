export const REDIS_QUEUE_NAME = "ORDERS_QUEUE";

export const ORDER_TYPES = {
    CREATE_ORDER: "CREATE_ORDER",
    CANCEL_ORDER: "CANCEL_ORDER",
    GET_OPEN_ORDERS: "GET_OPEN_ORDERS",
    GET_DEPTH: "GET_DEPTH",
    RESET_BOOK: "RESET_BOOK",
} as const;

export const ORDER_SIDE = {
    BID: "BID",
    ASK: "ASK",
};
