import { getDepth, getTrades } from "@/app/stores/apiData"
import { CurrentOrderBookTab, CurrentOrderBookType } from "@/app/stores/orderBook";
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
    if (reverseAfterAccumulate) {
        data.reverse();
    }
    return data;
};

const formatCompactNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
};

/* -------------------- ORDER ROW -------------------- */
const BaseOrderBook: React.FC<{ symbol: string }> = ({ symbol }: { symbol: string }) => {
    const [currentOrderBookTab, setCurrentOrderBookTab] = useAtom(CurrentOrderBookTab)

    return (
        <div className="flex h-full flex-col text-sm overflow-hidden select-none px-2">
            <div className="flex gap-2 text-sm text-gray-400 font-semibold py-4">
                <button className={`${currentOrderBookTab === CurrentOrderBookType.BOOK && "text-gray-200 bg-[#202127]"} py-2 px-4 rounded-lg`} onClick={() => setCurrentOrderBookTab(CurrentOrderBookType.BOOK)}>Book</button>
                <button className={`${currentOrderBookTab === CurrentOrderBookType.TRADES && "text-gray-200 bg-[#202127]"} py-2 px-4 rounded-lg`} onClick={() => setCurrentOrderBookTab(CurrentOrderBookType.TRADES)}>Trades</button>
            </div>
            <RenderOrderBookTab currentOrderBookTab={currentOrderBookTab} symbol={symbol} />
        </div>
    );
};

export const OrderBook = memo(BaseOrderBook)

const RenderOrderBookTab: React.FC<{ currentOrderBookTab: CurrentOrderBookType, symbol: string }> = ({ currentOrderBookTab, symbol }) => {
    if (currentOrderBookTab === CurrentOrderBookType.BOOK) {
        return (
            <RenderBookTab symbol={symbol} />
        )
    }
    return (
        <RenderTradesTab symbol={symbol} />
    )
}

const RenderBookTab: React.FC<{ symbol: string }> = ({ symbol }) => {

    const marketDepth = useMemo(() => getDepth({ symbol, limit: 20 }), [symbol]);
    const depthData = useAtomValue(marketDepth);

    if (depthData.state === "loading") return <div className="flex h-full items-center justify-center">Loading...</div>;
    if (depthData.state === "hasError") return <div className="flex h-full items-center justify-center">Error !!</div>;

    const { data } = depthData.data;

    return (
        <>
            <div className="flex py-1">
                <p className="flex-1 font-semibold">Price</p>
                <p className="flex-1 text-right text-gray-400">Size</p>
                <p className="flex-1 text-right text-gray-400">Total</p>
            </div>
            <div className="h-1/2 overflow-hidden">
                <div className="h-full overflow-y-auto no-scrollbar">
                    <Asks asksData={data.asks} symbol={symbol} />
                </div>
            </div>

            <div className="text-lg pl-4 py-2 text-green-400 font-medium">
                135.42
            </div>

            <div className="h-1/2 overflow-hidden">
                <div className="h-full overflow-y-auto no-scrollbar">
                    <Bids bidsData={data.bids} symbol={symbol} />
                </div>
            </div>
        </>
    )
}

const RenderTradesTab: React.FC<{ symbol: string }> = ({ symbol }) => {

    const containerRef = useRef<HTMLDivElement>(null);
    const trades = useMemo(() => getTrades({ symbol, limit: 100 }), [symbol])
    const tradesData = useAtomValue(trades)

    useEffect(() => {
        const el = containerRef.current
        if (el) {
            el.scrollTop = el.scrollHeight
        }
    }, [tradesData])

    if (tradesData.state === "loading") return <div className="flex h-full items-center justify-center">Loading...</div>;
    if (tradesData.state === "hasError") return <div className="flex h-full items-center justify-center">Error !!</div>;

    const tradesResponse = tradesData.data.data

    return (
        <>
            <div className="flex py-1 text-gray-400 font-semibold">
                <p className="flex-1">Price</p>
                <p className="flex-1 text-right">Qty</p>
                <p className="flex-1 text-right">Time</p>
            </div>
            <div ref={containerRef} className="h-full overflow-y-auto no-scrollbar">
                {tradesResponse.map((trade) => {
                    const price = Number(trade.price);
                    const qty = Number(trade.quantity);
                    const timeString = new Date(trade.timestamp).toLocaleTimeString('en-GB', { hour12: false });

                    const isBuy = !trade.isBuyerMaker;
                    const colorClass = isBuy
                        ? "text-green-400 hover:bg-green-950/30"
                        : "text-red-400 hover:bg-red-950/30";

                    return (
                        <div
                            key={trade.id}
                            className={`flex w-full py-1 ${colorClass} transition-colors`}
                        >
                            <div className="flex-1 font-medium">{price.toFixed(2)}</div>
                            <div className="flex-1 text-right">{qty.toFixed(3)}</div>
                            <div className="flex-1 text-right text-gray-500 text-xs">
                                {timeString}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    )
}

const Bids = ({ bidsData = [], symbol }: {
    bidsData: string[][];
    symbol: string;
}) => {
    const rows = useMemo(() => normalizeDepth(bidsData, false), [bidsData]);
    const maxTotal = useMemo(() => rows.reduce((max, r) => Math.max(max, r.total), 0), [rows]);

    return (
        <div className="divide-y divide-gray-800/50">
            {rows.map((bid) => (
                <div
                    key={`${symbol}_${bid.price}`}
                    className="flex w-full py-1 hover:bg-green-950/30 text-gray-300 relative"
                >
                    <div
                        className="absolute right-0 h-full z-0 bg-green-400/20"
                        style={{ width: `${(bid.total / maxTotal * 100)}%` }}
                    ></div>
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

const Asks = ({ asksData = [], symbol }: {
    asksData: string[][];
    symbol: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return
        containerRef.current.scrollTop = containerRef.current.scrollHeight
    }, [asksData])

    const rows = useMemo(() => normalizeDepth(asksData, true), [asksData]);
    const maxTotal = useMemo(() => rows.reduce((max, r) => Math.max(max, r.total), 0), [rows]);

    return (
        <div ref={containerRef} className="divide-y divide-gray-800/50 overflow-y-auto no-scrollbar h-full">
            {rows.map((ask) => {
                return (
                    <div
                        key={`${symbol}_${ask.price}`}
                        className="flex w-full py-1 hover:bg-red-950/30 text-gray-300 relative"
                    >
                        <div
                            className="absolute right-0 h-full z-0 bg-red-500/20"
                            style={{ width: `${(ask.total / maxTotal * 100)}%` }}
                        ></div>
                        <div className="flex w-full z-10">
                            <div className="flex-1 text-red-500/90">{ask.price.toFixed(2)}</div>
                            <div className="flex-1 text-right">{formatCompactNumber(ask.size)}</div>
                            <div className="flex-1 text-right">{formatCompactNumber(ask.total)}</div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};