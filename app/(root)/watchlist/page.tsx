import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getEnrichedWatchlist } from "@/lib/actions/watchlist.actions";
import WatchlistTable from "@/components/WatchlistTable";
import Link from "next/link";
import SearchCommand from "@/components/SearchCommand";
import { searchStocks } from "@/lib/actions/finnhub.actions";

// Mark this page as dynamic since it requires authentication
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/sign-in");

  const watchlist = await getEnrichedWatchlist(session.user.email);
  const initialStocks = await searchStocks();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-100">My Watchlist</h1>
          <SearchCommand
            renderAs="button"
            label="Add Stock"
            initialStocks={initialStocks}
          />
        </div>
        <p className="text-gray-400">
          Track your favorite stocks and monitor their performance
        </p>
      </div>

      {watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-24 h-24 text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-300 mb-2">
            Your watchlist is empty
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Start building your watchlist by searching for stocks and adding
            them to track their performance.
          </p>
          <SearchCommand
            renderAs="button"
            label="Add Your First Stock"
            initialStocks={initialStocks}
          />
        </div>
      ) : (
        <WatchlistTable watchlist={watchlist} userEmail={session.user.email} />
      )}
    </div>
  );
}
