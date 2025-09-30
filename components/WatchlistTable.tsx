"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  removeFromWatchlist,
  getEnrichedWatchlist,
} from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

type WatchlistItem = {
  symbol: string;
  company: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  peRatio: number | null;
};

type WatchlistTableProps = {
  watchlist: WatchlistItem[];
  userEmail: string;
};

export default function WatchlistTable({
  watchlist: initialWatchlist,
  userEmail,
}: WatchlistTableProps) {
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap: number | null) => {
    if (marketCap === null) return "N/A";
    if (marketCap >= 1000) return `$${(marketCap / 1000).toFixed(2)}T`;
    return `$${marketCap.toFixed(2)}B`;
  };

  const formatChange = (
    change: number | null,
    changePercent: number | null
  ) => {
    if (change === null || changePercent === null) return "N/A";
    const sign = change >= 0 ? "+" : "";
    const color = change >= 0 ? "text-green-500" : "text-red-500";
    return (
      <span className={color}>
        {sign}
        {change.toFixed(2)} ({sign}
        {changePercent.toFixed(2)}%)
      </span>
    );
  };

  const refreshData = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const freshData = await getEnrichedWatchlist(userEmail);
      setWatchlist(freshData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to refresh watchlist data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [userEmail]);

  const handleRemove = async (symbol: string) => {
    setRemovingSymbol(symbol);
    try {
      const result = await removeFromWatchlist(userEmail, symbol);
      if (result.success) {
        setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
        toast.success(`${symbol} removed from watchlist`);
      } else {
        toast.error(result.error || "Failed to remove from watchlist");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setRemovingSymbol(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end items-center mb-4 gap-2">
        <span className="text-sm text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh data"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-4 px-4 font-semibold text-gray-300">
              Company
            </th>
            <th className="text-left py-4 px-4 font-semibold text-gray-300">
              Symbol
            </th>
            <th className="text-right py-4 px-4 font-semibold text-gray-300">
              Price
            </th>
            <th className="text-right py-4 px-4 font-semibold text-gray-300">
              Change (Day)
            </th>
            <th className="text-right py-4 px-4 font-semibold text-gray-300">
              Market Cap
            </th>
            <th className="text-center py-4 px-4 font-semibold text-gray-300">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {watchlist.map((item) => (
            <tr
              key={item.symbol}
              className="border-b border-gray-800 hover:bg-gray-900 transition-colors"
            >
              <td className="py-4 px-4">
                <Link
                  href={`/stocks/${item.symbol}`}
                  className="text-gray-200 hover:text-yellow-500 transition-colors font-medium"
                >
                  {item.company}
                </Link>
              </td>
              <td className="py-4 px-4">
                <Link
                  href={`/stocks/${item.symbol}`}
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  {item.symbol}
                </Link>
              </td>
              <td className="py-4 px-4 text-right text-gray-300">
                {formatPrice(item.price)}
              </td>
              <td className="py-4 px-4 text-right">
                {formatChange(item.change, item.changePercent)}
              </td>
              <td className="py-4 px-4 text-right text-gray-300">
                {formatMarketCap(item.marketCap)}
              </td>
              <td className="py-4 px-4 text-center">
                <button
                  onClick={() => handleRemove(item.symbol)}
                  disabled={removingSymbol === item.symbol}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Remove ${item.symbol} from watchlist`}
                >
                  {removingSymbol === item.symbol ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
