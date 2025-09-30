"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import { revalidatePath } from "next/cache";
import { fetchJSON } from "./finnhub.actions";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const NEXT_PUBLIC_FINNHUB_API_KEY =
  process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";

export async function getWatchlistSymbolsByEmail(
  email: string
): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("getWatchlistSymbolsByEmail error:", err);
    return [];
  }
}

export async function getWatchlistByEmail(
  email: string
): Promise<{ symbol: string; company: string; addedAt: Date }[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();

    return items.map((item) => ({
      symbol: String(item.symbol),
      company: String(item.company),
      addedAt: item.addedAt,
    }));
  } catch (err) {
    console.error("getWatchlistByEmail error:", err);
    return [];
  }
}

export async function addToWatchlist(
  email: string,
  symbol: string,
  company: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !symbol || !company) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) {
      return { success: false, error: "Invalid user ID" };
    }

    await Watchlist.create({
      userId,
      symbol: symbol.toUpperCase(),
      company,
      addedAt: new Date(),
    });

    revalidatePath("/watchlist");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("addToWatchlist error:", err);
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return { success: false, error: "Stock already in watchlist" };
    }
    return { success: false, error: "Failed to add to watchlist" };
  }
}

export async function removeFromWatchlist(
  email: string,
  symbol: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !symbol) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) {
      return { success: false, error: "Invalid user ID" };
    }

    await Watchlist.deleteOne({
      userId,
      symbol: symbol.toUpperCase(),
    });

    revalidatePath("/watchlist");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("removeFromWatchlist error:", err);
    return { success: false, error: "Failed to remove from watchlist" };
  }
}

export async function getEnrichedWatchlist(email: string): Promise<
  {
    symbol: string;
    company: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    marketCap: number | null;
    peRatio: number | null;
  }[]
> {
  if (!email) return [];

  try {
    const watchlistItems = await getWatchlistByEmail(email);
    if (watchlistItems.length === 0) return [];

    const token = process.env.FINNHUB_API_KEY ?? NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) {
      console.error("FINNHUB API key is not configured");
      return [];
    }

    const enrichedData = await Promise.all(
      watchlistItems.map(async (item) => {
        try {
          // Fetch current quote data (includes change from previous close)
          const quoteUrl = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(
            item.symbol
          )}&token=${token}`;
          const quote = await fetchJSON<QuoteData>(quoteUrl, 0); // No cache for real-time data

          // Fetch profile data for market cap
          const profileUrl = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(
            item.symbol
          )}&token=${token}`;
          const profile = await fetchJSON<ProfileData>(profileUrl, 3600);

          return {
            symbol: item.symbol,
            company: item.company,
            price: quote?.c ?? null,
            change: quote?.d ?? null, // Change from previous close
            changePercent: quote?.dp ?? null, // Change percent from previous close
            marketCap: profile?.marketCapitalization ?? null,
            peRatio: null, // PE ratio not available in basic profile
          };
        } catch (error) {
          console.error(`Error fetching data for ${item.symbol}:`, error);
          return {
            symbol: item.symbol,
            company: item.company,
            price: null,
            change: null,
            changePercent: null,
            marketCap: null,
            peRatio: null,
          };
        }
      })
    );

    return enrichedData;
  } catch (err) {
    console.error("getEnrichedWatchlist error:", err);
    return [];
  }
}
