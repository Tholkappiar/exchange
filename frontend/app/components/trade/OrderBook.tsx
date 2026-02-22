import { useWsSubscription } from "@/app/hooks/useWsSubscription";
import { marketSymbol } from "@/app/stores/common";
import { CurrentOrderBookTab, CurrentOrderBookType } from "@/app/stores/orderBook";
import { mapWsTrade, wsDepthAtom, wsDepthResponse, wsTradeResponse, wsTradesAtom } from "@/app/stores/wsData";
import { useAtom, useAtomValue } from "jotai"
import { memo, useEffect, useMemo, useRef } from "react"

export type DepthRow = { price: number; size: number; total: number };

const normalizeDepth = (levels: string[][], reverseAfterAccumulate: boolean): DepthRow[] => {
    const data: DepthRow[] = levels.map(([p, s]) => ({ price: Number(p), size: Number(s), total: 0 }));
    let total = 0;
    data.forEach((d) => {
        total += d.size;
        d.total = total;
    });
    if (reverseAfterAccumulate) data.reverse();
    return data;
};

const formatCompactNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
};

/* -------------------- HOOKS -------------------- */

export function useTradeStream(symbol: string | null) {
    const [trades, setTrades] = useAtom(wsTradesAtom);

    useWsSubscription<{ data: wsTradeResponse }>({
        channel: "trade",
        symbol,
        onMessage: ({ data }) => {
            setTrades(prev => [...prev.slice(-100), data]);
        },
        onCleanup: () => {
            setTrades([]);
        }
    });

    return trades;
}

export function useDepthStream(symbol: string | null) {
    const [depths, setDepths] = useAtom(wsDepthAtom);

    useWsSubscription<{ data: wsDepthResponse }>({
        channel: "depth",
        symbol,
        onMessage: ({ data }) => {
            setDepths(prev => [...prev.slice(-100), data]);
        },
        onCleanup: () => {
            setDepths([]);
        }
    });

    return depths;
}

/* -------------------- ORDER BOOK -------------------- */

const BaseOrderBook = () => {
    const [currentOrderBookTab, setCurrentOrderBookTab] = useAtom(CurrentOrderBookTab);

    // Hoisted here so streams stay alive across tab switches
    const symbol = useAtomValue(marketSymbol)
    const trades = useTradeStream(symbol);
    const depths = useDepthStream(symbol);

    if (!symbol) return

    return (
        <div className="flex h-full flex-col text-sm overflow-hidden select-none px-2">
            <div className="flex gap-2 text-sm text-gray-400 font-semibold py-4">
                <button
                    className={`${currentOrderBookTab === CurrentOrderBookType.BOOK && "text-gray-200 bg-[#202127]"} py-2 px-4 rounded-lg`}
                    onClick={() => setCurrentOrderBookTab(CurrentOrderBookType.BOOK)}
                >
                    Book
                </button>
                <button
                    className={`${currentOrderBookTab === CurrentOrderBookType.TRADES && "text-gray-200 bg-[#202127]"} py-2 px-4 rounded-lg`}
                    onClick={() => setCurrentOrderBookTab(CurrentOrderBookType.TRADES)}
                >
                    Trades
                </button>
            </div>
            <RenderOrderBookTab
                currentOrderBookTab={currentOrderBookTab}
                symbol={symbol}
                trades={trades}
                depths={depths}
            />
        </div>
    );
};

export const OrderBook = memo(BaseOrderBook);

/* -------------------- TAB ROUTER -------------------- */

type TradeStream = ReturnType<typeof useTradeStream>;
type DepthStream = ReturnType<typeof useDepthStream>;

const RenderOrderBookTab: React.FC<{
    currentOrderBookTab: CurrentOrderBookType;
    symbol: string;
    trades: TradeStream;
    depths: DepthStream;
}> = ({ currentOrderBookTab, symbol, trades, depths }) => {
    if (currentOrderBookTab === CurrentOrderBookType.BOOK) {
        return <RenderBookTab symbol={symbol} depths={depths} />;
    }
    return <RenderTradesTab trades={trades} />;
};

/* -------------------- BOOK TAB -------------------- */

const RenderBookTab: React.FC<{ symbol: string; depths: DepthStream }> = ({ symbol, depths }) => {
    const allAsks: string[][] = [];
    const allBids: string[][] = [];

    depths?.forEach(d => {
        if (d.a.length > 0) allAsks.push(...d.a);
        if (d.b.length > 0) allBids.push(...d.b);
    });

    if (!depths?.length) return <div className="flex h-full items-center justify-center">Loading...</div>;

    return (
        <>
            <div className="flex py-1">
                <p className="flex-1 font-semibold">Price</p>
                <p className="flex-1 text-right text-gray-400">Size</p>
                <p className="flex-1 text-right text-gray-400">Total</p>
            </div>
            <div className="h-1/2 overflow-hidden">
                <div className="h-full overflow-y-auto no-scrollbar">
                    <Asks asksData={allAsks} symbol={symbol} />
                </div>
            </div>

            <div className="text-lg pl-4 py-2 text-green-400 font-medium">
                135.42
            </div>

            <div className="h-1/2 overflow-hidden">
                <div className="h-full overflow-y-auto no-scrollbar">
                    <Bids bidsData={allBids} symbol={symbol} />
                </div>
            </div>
        </>
    );
};

/* -------------------- TRADES TAB -------------------- */

const RenderTradesTab: React.FC<{ trades: TradeStream }> = ({ trades }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [trades]);

    if (!trades?.length) return <div className="flex h-full items-center justify-center">Loading...</div>;

    return (
        <>
            <div className="flex py-1 text-gray-400 font-semibold">
                <p className="flex-1">Price</p>
                <p className="flex-1 text-right">Qty</p>
                <p className="flex-1 text-right">Time</p>
            </div>
            <div ref={containerRef} className="h-full overflow-y-auto no-scrollbar">
                {trades.map((trade) => {
                    const t = mapWsTrade(trade);
                    const price = Number(t.price);
                    const qty = Number(t.quantity);
                    const timeString = new Date(t.eventTime).toLocaleTimeString('en-GB', { hour12: false });
                    const isBuy = !t.isBuyerMaker;
                    const colorClass = isBuy
                        ? "text-green-400 hover:bg-green-950/30"
                        : "text-red-400 hover:bg-red-950/30";

                    return (
                        <div
                            key={t.tradeId}
                            className={`flex w-full py-1 ${colorClass} transition-colors`}
                        >
                            <div className="flex-1 font-medium">{price.toFixed(2)}</div>
                            <div className="flex-1 text-right">{qty.toFixed(3)}</div>
                            <div className="flex-1 text-right text-gray-500 text-xs">{timeString}</div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

/* -------------------- BIDS -------------------- */

const Bids = ({ bidsData = [], symbol }: { bidsData: string[][]; symbol: string }) => {
    const rows = useMemo(() => normalizeDepth(bidsData, false), [bidsData]);
    const maxTotal = useMemo(() => rows.reduce((max, r) => Math.max(max, r.total), 0), [rows]);

    if (bidsData.length === 0) return null;

    return (
        <div className="divide-y divide-gray-800/50">
            {rows.map((bid, index) => (
                <div
                    key={`${symbol}_${bid.price}_${index}`}
                    className="flex w-full py-1 hover:bg-green-950/30 text-gray-300 relative"
                >
                    <div
                        className="absolute right-0 h-full z-0 bg-green-400/20"
                        style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                    />
                    <div className="flex w-full z-10">
                        <div className="flex-1 text-green-500/90">{bid.price.toFixed(2)}</div>
                        <div className="flex-1 text-right">{formatCompactNumber(bid.size)}</div>
                        <div className="flex-1 text-right">{formatCompactNumber(bid.total)}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

/* -------------------- ASKS -------------------- */

const Asks = ({ asksData = [], symbol }: { asksData: string[][]; symbol: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, [asksData]);

    const rows = useMemo(() => normalizeDepth(asksData, true), [asksData]);
    const maxTotal = useMemo(() => rows.reduce((max, r) => Math.max(max, r.total), 0), [rows]);

    if (asksData.length === 0) return null;

    return (
        <div ref={containerRef} className="divide-y divide-gray-800/50 overflow-y-auto no-scrollbar h-full">
            {rows.map((ask, index) => (
                <div
                    key={`${symbol}_${ask.price}_${index}`}
                    className="flex w-full py-1 hover:bg-red-950/30 text-gray-300 relative"
                >
                    <div
                        className="absolute right-0 h-full z-0 bg-red-500/20"
                        style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                    />
                    <div className="flex w-full z-10">
                        <div className="flex-1 text-red-500/90">{ask.price.toFixed(2)}</div>
                        <div className="flex-1 text-right">{formatCompactNumber(ask.size)}</div>
                        <div className="flex-1 text-right">{formatCompactNumber(ask.total)}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};