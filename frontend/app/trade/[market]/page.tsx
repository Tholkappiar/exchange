'use client'

import { CandleChart } from '@/app/components/trade/Chart';
import { OrderBook } from '@/app/components/trade/OrderBook';
import { Ticker } from '@/app/components/trade/Ticker';
import { TradingPanel } from '@/app/components/trade/TradePanel';
import { useParams } from 'next/navigation';

const Page = () => {
    const { market } = useParams();
    const symbol = String(market)

    return (
        <div className="flex flex-col gap-4 p-4 bg-[#0e0f14] text-white h-screen overflow-hidden">
            <Ticker symbol={symbol} />
            <div className="flex flex-row gap-4 flex-1 overflow-hidden">
                {/* Left Panel */}
                <div className="flex gap-4 w-[80%] h-full">
                    <div className="w-[80%] h-full">
                        <CandleChart symbol={symbol} />
                    </div>
                    <div className="w-[20%] h-full bg-[#14151b]">
                        <OrderBook symbol={symbol} />
                    </div>
                </div>
                {/* Right Panel */}
                <div className="w-[20%] bg-[#14151b] h-full">
                    <TradingPanel />
                </div>
            </div>
        </div>
    );
};

export default Page;