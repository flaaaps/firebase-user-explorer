import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SimpleUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  creationTime?: string;
  lastSignInTime?: string;
};

// In-memory cache of all users to improve performance across requests.
type CacheEntry = { users: SimpleUser[]; fetchedAt: number };
let USERS_CACHE: CacheEntry | null = null;

const TTL_MS =
  parseInt(process.env.USERS_CACHE_TTL_MS || "", 10) || 5 * 60 * 1000; // 5 minutes
const MAX_SCAN_USERS = parseInt(process.env.MAX_SCAN_USERS || "", 10) || 20000; // safety upper bound

async function loadAllUsers(): Promise<SimpleUser[]> {
  // If cache is fresh, return it
  if (USERS_CACHE && Date.now() - USERS_CACHE.fetchedAt < TTL_MS) {
    return USERS_CACHE.users;
  }

  const auth = getAdminAuth();
  const all: SimpleUser[] = [];
  let nextPageToken: string | undefined = undefined;

  while (true) {
    const res = await auth.listUsers(1000, nextPageToken);
    for (const u of res.users) {
      all.push({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        photoURL: u.photoURL ?? null,
        disabled: u.disabled,
        creationTime: u.metadata?.creationTime,
        lastSignInTime: u.metadata?.lastSignInTime,
      });
    }
    if (!res.pageToken) break;
    nextPageToken = res.pageToken;
    if (all.length >= MAX_SCAN_USERS) break;
  }

  USERS_CACHE = { users: all, fetchedAt: Date.now() };
  return all;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.max(
    1,
    Math.min(200, parseInt(searchParams.get("limit") || "50", 10)),
  );

  // Always prevent caching of this API
  const baseHeaders = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
  });

  if (q.length < 2) {
    return new Response(
      JSON.stringify({ users: [], totalScanned: 0, tookMs: 0 }),
      {
        status: 200,
        headers: baseHeaders,
      },
    );
  }

  const started = Date.now();
  try {
    const allUsers = await loadAllUsers();
    const qLower = q.toLowerCase();
    const matches: SimpleUser[] = [];
    for (const u of allUsers) {
      const email = u.email || "";
      if (email.toLowerCase().includes(qLower)) {
        matches.push(u);
        if (matches.length >= limit) break;
      }
    }
    const tookMs = Date.now() - started;
    return new Response(
      JSON.stringify({ users: matches, totalScanned: allUsers.length, tookMs }),
      { status: 200, headers: baseHeaders },
    );
  } catch (err: any) {
    const tookMs = Date.now() - started;
    const message =
      process.env.NODE_ENV === "development"
        ? err?.message || String(err)
        : "Internal error";
    return new Response(JSON.stringify({ error: message, tookMs }), {
      status: 500,
      headers: baseHeaders,
    });
  }
}
