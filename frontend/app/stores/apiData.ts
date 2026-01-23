import axios from "axios";
import { atom } from "jotai";
import {
    APIS,
    DepthLimit,
    KlineInterval,
    KlinePriceType,
    TickerInterval,
} from "../utils/constant";
import { loadable } from "jotai/utils";

export interface TickersResponse {
    firstPrice: string;
    high: string;
    lastPrice: string;
    low: string;
    priceChange: string;
    priceChangePercent: string;
    quoteVolume: string;
    symbol: string;
    trades: string;
    volume: string;
}

export const getTickers = (interval: TickerInterval) =>
    loadable(
        atom(async () => {
            return await axios.get<TickersResponse[]>(
                APIS.BACKEND.tickers({ interval: interval })
            );
        })
    );

export interface TickerResponse {
    firstPrice: string;
    high: string;
    lastPrice: string;
    low: string;
    priceChange: string;
    priceChangePercent: string;
    quoteVolume: string;
    symbol: string;
    trades: string;
    volume: string;
}

export const getTicker = ({
    symbol,
    interval,
}: {
    symbol: string;
    interval: TickerInterval;
}) =>
    loadable(
        atom(async () => {
            return await axios.get<TickerResponse>(
                APIS.BACKEND.ticker({ symbol, interval })
            );
        })
    );

export interface KLinesData {
    close: string;
    end: string;
    high: string;
    low: string;
    open: string;
    quoteVolume: string;
    start: string;
    trades: string;
    volume: string;
}

export const getKLines = ({
    symbol,
    interval,
    startTime,
    endTime,
    priceType,
}: {
    symbol: string;
    interval: KlineInterval;
    startTime: number;
    endTime?: number;
    priceType?: KlinePriceType;
}) =>
    loadable(
        atom(async () => {
            return await axios.get<KLinesData[]>(
                APIS.BACKEND.kLines({
                    symbol,
                    interval,
                    startTime,
                    endTime,
                    priceType,
                })
            );
        })
    );

export interface DepthResponse {
    asks: string[][];
    bids: string[][];
    lastUpdateId: string;
    timestamp: number;
}

export const getDepth = ({
    symbol,
    limit,
}: {
    symbol: string;
    limit: DepthLimit;
}) =>
    loadable(
        atom(async () => {
            return await axios.get<DepthResponse>(
                APIS.BACKEND.depth({
                    symbol,
                    limit,
                })
            );
        })
    );

export interface TradesResponse {
    id: number;
    price: string;
    quantity: string;
    quoteQuantity: string;
    timestamp: number;
    isBuyerMaker: boolean;
}

export const getTrades = ({
    symbol,
    limit,
}: {
    symbol: string;
    limit: number;
}) =>
    loadable(
        atom(async () => {
            return await axios.get<TradesResponse[]>(
                APIS.BACKEND.trades({
                    symbol,
                    limit,
                })
            );
        })
    );
