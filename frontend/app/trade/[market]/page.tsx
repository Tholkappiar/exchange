'use client'

import { CandleChart } from '@/app/components/trade/Chart';
import { OrderBook } from '@/app/components/trade/OrderBook';
import { Ticker } from '@/app/components/trade/Ticker';
import { TradingPanel } from '@/app/components/trade/TradePanel';
import { marketSymbol } from '@/app/stores/common';
import { useSetAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

const Page = () => {
    const { market } = useParams();
    const symbol = String(market)

    const setSymbol = useSetAtom(marketSymbol);
    useEffect(() => {
        if (!symbol) return
        setSymbol(symbol)

        return () => {
            setSymbol(null)
        }
    }, [symbol])

    return (
        <div className="flex flex-col gap-4 p-4 bg-[#0e0f14] text-white h-screen overflow-hidden">
            <Ticker />
            <div className="flex flex-row gap-4 flex-1 overflow-hidden">
                {/* Left Panel */}
                <div className="flex gap-4 w-[80%] h-full">
                    <div className="w-[70%] h-full">
                        <CandleChart />
                    </div>
                    <div className="w-[30%] h-full bg-[#14151b]">
                        <OrderBook />
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