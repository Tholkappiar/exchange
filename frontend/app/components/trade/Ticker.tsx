import { getTicker } from "@/app/stores/apiData"
import { useAtomValue } from "jotai"
import { memo, useMemo } from "react"

const BaseTicker: React.FC<{ symbol: string }> = ({ symbol }: { symbol: string }) => {

    const tickerAtom = useMemo(() => getTicker({ symbol: String(symbol), interval: "1d" }), [symbol])
    const value = useAtomValue(tickerAtom)

    if (value.state === "loading") {
        return (
            <>Loading...</>
        )
    }

    if (value.state === "hasError") {
        return (
            <>error !!!</>
        )
    }

    const { data } = value.data
    const getChangeColor = (change: string) => {
        const numChange = parseFloat(change);
        return numChange >= 0 ? 'text-green-400' : 'text-red-500';
    };

    const changeNum = parseFloat(data?.priceChange || '0');
    const percentNum = parseFloat(data?.priceChangePercent || '0') * 100;
    const changeColor = getChangeColor(data?.priceChangePercent || '0');

    return (
        <div className='bg-[#14151b] rounded-lg p-4'>
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                    <div className='flex gap-4 items-center'>
                        <div className='rounded-full bg-yellow-700 h-10 w-10 flex items-center justify-center font-bold'>SOL</div>
                        <p className="text-xl text-gray-300 font-semibold">{data?.symbol || symbol}</p>
                    </div>
                    <div className="">
                        <p className="text-lg font-bold">{parseFloat(data?.lastPrice || '0').toFixed(2)}</p>
                        <p className={`${changeColor} text-xs`}>
                            {parseFloat(data?.lastPrice || '0').toFixed(2)}
                        </p>
                    </div>
                    <div className='flex gap-8 text-gray-300 text-sm ml-4'>
                        <div>
                            <p className='font-semibold text-gray-500'>24H Change</p>
                            <p className='text-red-500 font-bold'>{data.priceChange}</p>
                        </div>
                        <div>
                            <p className='font-semibold text-gray-500'>24H High</p>
                            <p className='text-red-500 font-bold'>{data.high}</p>
                        </div>
                        <div>
                            <p className='font-semibold text-gray-500'>24H Volume</p>
                            <p className='text-red-500 font-bold'>{data.quoteVolume}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const Ticker = memo(BaseTicker)