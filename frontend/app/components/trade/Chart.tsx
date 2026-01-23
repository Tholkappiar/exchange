import { getKLines } from "@/app/stores/apiData";
import { useAtomValue } from "jotai";
import { CandlestickSeries, createChart, UTCTimestamp } from "lightweight-charts";
import { memo, useEffect, useMemo, useRef } from "react";

const startTime = Math.floor((new Date().getTime() - 1000 * 60 * 60 * 24 * 7) / 1000)
const endTime = Math.floor(new Date().getTime() / 1000)

const BaseCandleChart = ({ symbol }: { symbol: string }) => {
    const chartRef = useRef<HTMLDivElement | null>(null)


    const getKlinesData = useMemo(
        () => getKLines({ symbol, interval: "1h", startTime, endTime }),
        [symbol]
    );
    const kLinesData = useAtomValue(getKlinesData)

    const candleData = useMemo(() => {
        if (kLinesData.state !== 'hasData') return []
        return kLinesData.data.data.map(kline => ({
            time: Math.floor(new Date(kline.start).getTime() / 1000) as UTCTimestamp,
            open: parseFloat(kline.open),
            high: parseFloat(kline.high),
            low: parseFloat(kline.low),
            close: parseFloat(kline.close),
        }));
    }, [kLinesData])

    useEffect(() => {
        if (!chartRef.current) return
        const container = chartRef.current
        const chart = createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            timeScale: { timeVisible: true },
            rightPriceScale: {
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            layout: {
                background: {
                    color: '#14151b',
                },
                textColor: 'white',
            },
            grid: {
                horzLines: {
                    color: "#282929"
                },
                vertLines: {
                    color: "#282929"
                }
            }
        })
        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
        })
        series.setData(candleData)
        chart.timeScale().fitContent()
        const handleResize = () => {
            chart.resize(container.clientWidth, container.clientHeight)
        }
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [kLinesData])

    if (kLinesData.state === "loading") {
        return (
            <>Loading...</>
        )
    }

    if (kLinesData.state === "hasError") {
        return (
            <>Error !!</>
        )
    }

    return <div ref={chartRef} className="h-full w-full" />
}

export const CandleChart = memo(BaseCandleChart)
