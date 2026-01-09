export const ROOT_BACKEND_URL = "http://localhost:5001";
const BACKEND_VERSION = "/api/v1";

/* =======================
    Types
======================= */

export type TickerInterval = "1d" | "1w";

export type Ticker = {
    symbol: string;
    interval?: TickerInterval;
};

export type Tickers = {
    interval?: TickerInterval;
};

export type KlineInterval =
    | "1m"
    | "3m"
    | "5m"
    | "15m"
    | "30m"
    | "1h"
    | "2h"
    | "4h"
    | "6h"
    | "8h"
    | "12h"
    | "1d"
    | "3d"
    | "1w"
    | "1month";

export type KlinePriceType = "Last" | "Index" | "Mark";

type KLines = {
    symbol: string;
    interval: KlineInterval;
    startTime: number;
    endTime?: number;
    priceType?: KlinePriceType;
};

export type DepthLimit = 5 | 10 | 20 | 50 | 100 | 500 | 1000;

type Depth = {
    symbol: string;
    limit?: DepthLimit;
};

/* =======================
    Utils
======================= */

const buildQuery = (
    params: Record<string, string | number | undefined>
): string =>
    Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

/* =======================
    API
======================= */
const BASE_BACKEND_URL = `${ROOT_BACKEND_URL}${BACKEND_VERSION}`;

export const APIS = {
    BACKEND: {
        ticker: (ticker: Ticker) =>
            `${BASE_BACKEND_URL}/ticker?${buildQuery({
                symbol: ticker.symbol,
                interval: ticker.interval,
            })}`,
        tickers: (tickers: Tickers) =>
            `${BASE_BACKEND_URL}/tickers${
                tickers.interval ? `?interval=${tickers.interval}` : ""
            }`,
        kLines: (k: KLines) =>
            `${BASE_BACKEND_URL}/klines?${buildQuery({
                symbol: k.symbol,
                interval: k.interval,
                startTime: k.startTime,
                endTime: k.endTime,
                priceType: k.priceType,
            })}`,
        depth: (depth: Depth) =>
            `${BASE_BACKEND_URL}/depth?${buildQuery({
                symbol: depth.symbol,
                limit: depth.limit,
            })}`,
    },
};
