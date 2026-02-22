import { useWsSubscription } from "@/app/hooks/useWsSubscription";
import { getKLines } from "@/app/stores/apiData";
import { marketSymbol } from "@/app/stores/common";
import { wsKlineResponse, wsKlinesAtom } from "@/app/stores/wsData";
import { useAtom, useAtomValue } from "jotai";
import { CandlestickSeries, createChart, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { memo, useEffect, useMemo, useRef } from "react";

const startTime = Math.floor((new Date().getTime() - 1000 * 60 * 60 * 24 * 7) / 1000);
const endTime = Math.floor(new Date().getTime() / 1000);

const BaseCandleChart = () => {
    const chartRef = useRef<HTMLDivElement | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const symbol = useAtomValue(marketSymbol);

    const getKlinesData = useMemo(
        () => getKLines({ symbol, interval: "1h", startTime, endTime }),
        [symbol]
    );
    const kLinesData = useAtomValue(getKlinesData);

    const candleData = useMemo(() => {
        if (kLinesData.state !== 'hasData' || !kLinesData || !kLinesData.data) return [];
        return kLinesData?.data.data
            .filter(kline => kline.open !== null && kline.high !== null && kline.low !== null && kline.close !== null)
            .map(kline => ({
                time: Math.floor(new Date(kline.start).getTime() / 1000) as UTCTimestamp,
                open: parseFloat(kline.open),
                high: parseFloat(kline.high),
                low: parseFloat(kline.low),
                close: parseFloat(kline.close),
            }))
            .sort((a, b) => a.time - b.time);
    }, [kLinesData]);

    function mapWsKlineToCandle(kline: wsKlineResponse) {
        const { data } = kline;
        if (!data) return null;

        // Skip empty candles with no trades
        if (data.o === null || data.h === null || data.l === null || data.c === null) {
            return null;
        }

        return {
            time: Math.floor(new Date(data.t).getTime() / 1000) as UTCTimestamp,
            open: Number(data.o),
            high: Number(data.h),
            low: Number(data.l),
            close: Number(data.c),
        };
    }

    const [KlineData, setKlineData] = useAtom(wsKlinesAtom);

    useWsSubscription({
        channel: "kline",
        onCleanup: () => { setKlineData(null); },
        onMessage: (data: wsKlineResponse) => {
            const candle = mapWsKlineToCandle(data);
            setKlineData(candle);
        },
        symbol: symbol
    });

    // Create chart and set initial historical data
    useEffect(() => {
        if (!chartRef.current || kLinesData.state !== 'hasData') return;
        const container = chartRef.current;
        const chart = createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            timeScale: { timeVisible: true },
            rightPriceScale: {
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            layout: {
                background: { color: '#14151b' },
                textColor: 'white',
            },
            grid: {
                horzLines: { color: "#282929" },
                vertLines: { color: "#282929" },
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
        });
        seriesRef.current = series;
        series.setData(candleData);
        chart.timeScale().fitContent();

        const handleResize = () => {
            chart.resize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            seriesRef.current = null;
        };
    }, [kLinesData, candleData]);

    // Update chart with real-time WebSocket data
    useEffect(() => {
        if (!KlineData || !seriesRef.current) return;

        const lastCandle = candleData[candleData.length - 1];
        if (Number(KlineData.time) < (lastCandle?.time || 0)) {
            console.warn('Skipping WS update: time is earlier than last historical candle');
            return;
        }

        seriesRef.current.update({
            ...KlineData
        });
    }, [KlineData, candleData]);

    if (kLinesData.state === "loading") return <>Loading...</>;
    if (kLinesData.state === "hasError") return <>Error !!</>;

    return <div ref={chartRef} className="h-full w-full" />;
};

export const CandleChart = memo(BaseCandleChart);