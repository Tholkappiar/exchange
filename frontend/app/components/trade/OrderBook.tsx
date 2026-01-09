import { getDepth } from "@/app/stores/apiData"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

/* -------------------- ORDER ROW -------------------- */
export const OrderBook: React.FC<{ symbol: string }> = () => {
    const symbol = "SOL_USDC";
    const marketDepth = useMemo(() => getDepth({ symbol, limit: 20 }), [symbol]);
    const depthData = useAtomValue(marketDepth);

    console.log("depth : ", depthData);

    if (depthData.state === "loading") return <div className="flex h-full items-center justify-center">Loading...</div>;
    if (depthData.state === "hasError") return <div className="flex h-full items-center justify-center">Error !!</div>;

    const { data } = depthData.data;

    return (
        <div className="flex h-full flex-col text-sm overflow-hidden select-none">
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
        </div>
    );
};

const Bids = ({ bidsData = [], symbol }: {
    bidsData: string[][];
    symbol: string;
}) => {
    return (
        <div className="divide-y divide-gray-800/50">
            {bidsData.map((bid) => (
                <div
                    key={`${symbol}_${bid[0]}_${bid[1]}`}
                    className="flex w-full px-2 py-1 hover:bg-green-950/30 text-green-400/90"
                >
                    <div className="flex-1">{Number(bid[0]).toFixed(2)}</div>
                    <div className="flex-1 text-right">{Number(bid[1]).toLocaleString()}</div>
                    <div className="flex-1 text-right text-gray-400">101</div>
                </div>
            ))}
        </div>
    );
};

const Asks = ({ asksData = [], symbol }: {
    asksData: string[][];
    symbol: string;
}) => {
    return (
        <div className="divide-y divide-gray-800/50">
            {asksData.map((ask) => (
                <div
                    key={`${symbol}_${ask[0]}_${ask[1]}`}
                    className="flex w-full px-2 py-1 hover:bg-red-950/30 text-red-400/90"
                >
                    <div className="flex-1">{Number(ask[0]).toFixed(2)}</div>
                    <div className="flex-1 text-right">{Number(ask[1]).toLocaleString()}</div>
                    <div className="flex-1 text-right text-gray-400">101</div>
                </div>
            ))}
        </div>
    );
};