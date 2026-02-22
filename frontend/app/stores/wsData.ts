import { atom } from "jotai";
import { Time } from "lightweight-charts";

export interface WsTickerResponse {
    stream: string;
    data: wsTickerData;
}

export interface wsTickerData {
    e: string;
    E: number;
    s: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    V: string;
    n: number;
}

export interface wsDepthResponse {
    e: string;
    E: number;
    s: string;
    a: string[][]; // asks
    b: string[][]; // bids
    U: number;
    u: number;
    T: number;
}

export interface DepthLevel {
    price: number;
    quantity: number;
}

export interface Depth {
    eventType: "depth";
    eventTime: number;
    symbol: string;
    asks: DepthLevel[];
    bids: DepthLevel[];
    firstUpdateId: number;
    lastUpdateId: number;
    engineTimestamp: number;
}

export function mapWsDepth(data: wsDepthResponse): Depth {
    return {
        eventType: data.e as "depth",
        eventTime: data.E,
        symbol: data.s,
        asks: data.a.map(([price, quantity]) => ({
            price: Number(price),
            quantity: Number(quantity),
        })),
        bids: data.b.map(([price, quantity]) => ({
            price: Number(price),
            quantity: Number(quantity),
        })),
        firstUpdateId: data.U,
        lastUpdateId: data.u,
        engineTimestamp: data.T,
    };
}

export interface wsKlineResponse {
    data: wsKlineData;
    stream: string;
}

export interface wsKlineData {
    e: string;
    E: number;
    s: string;
    t: string;
    T: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    n: number;
    X: boolean;
}

export interface wsTradeResponse {
    e: "trade";
    E: number;
    s: string;
    p: string;
    q: string;
    b: string;
    a: string;
    t: number;
    T: number;
    m: boolean;
}

export interface Trade {
    eventType: "trade";
    eventTime: number;
    symbol: string;
    price: number;
    quantity: number;
    buyerOrderId: string;
    sellerOrderId: string;
    tradeId: number;
    engineTimestamp: number;
    isBuyerMaker: boolean;
}

export function mapWsTrade(data: wsTradeResponse): Trade {
    return {
        eventType: data.e,
        eventTime: data.E,
        symbol: data.s,
        price: Number(data.p),
        quantity: Number(data.q),
        buyerOrderId: data.b,
        sellerOrderId: data.a,
        tradeId: data.t,
        engineTimestamp: data.T,
        isBuyerMaker: data.m,
    };
}

export interface wsKlinesData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
}

export const wsTickerAtom = atom<wsTickerData | null>(null);
export const wsDepthAtom = atom<wsDepthResponse[]>([]);
export const wsKlinesAtom = atom<wsKlinesData | null>(null);
export const wsTradesAtom = atom<wsTradeResponse[]>([]);
