"use client"

import { useAtomValue } from "jotai";
import { getTickers } from "./stores/apiData";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function Home() {
  const tickers = useMemo(() => getTickers('1d'), [])
  const value = useAtomValue(tickers);
  const router = useRouter()


  if (value.state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (value.state === "hasError") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading data.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Helper functions
  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatVolume = (volume: string) => {
    return parseFloat(volume).toLocaleString();
  };

  const formatChange = (change: string) => {
    return parseFloat(change).toFixed(1);
  };

  const getChangeColor = (change: string) => {
    const numChange = parseFloat(change);
    return numChange >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-6xl mx-auto">
          <h1 className="text-xl font-bold">Backpack</h1>
          <nav className="flex items-center space-x-6 text-sm text-gray-400 font-medium">
            <button className="hover:text-white transition-colors px-2 py-1">Spot</button>
            <button className="hover:text-white transition-colors px-2 py-1">Futures</button>
            <button className="hover:text-white transition-colors px-2 py-1">Lend</button>
          </nav>
          <button className="text-gray-400 hover:text-white text-sm px-2 py-1">Connect</button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-[90%] mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Markets</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-md">
              <thead className="border-b border-gray-700">
                <tr className="text-gray-400">
                  <th className="px-4 py-2 text-left">Pair</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">24h Vol</th>
                  <th className="px-4 py-2 text-right">24h %</th>
                </tr>
              </thead>
              <tbody className="text-lg">
                {value.data.data.map((coin) => (
                  <tr
                    key={coin.symbol}
                    onClick={() => router.push(`/trade/${coin.symbol}`)}
                    className={`border-b border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer`}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {coin.symbol}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatPrice(coin.lastPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      ${formatVolume(coin.quoteVolume)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`${getChangeColor(coin.priceChangePercent)}`}>
                        {formatChange(coin.priceChangePercent)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!value.data.data || value.data.data.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No data available.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}