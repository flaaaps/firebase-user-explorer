"use client";

import React from "react";

type SimpleUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  creationTime?: string;
  lastSignInTime?: string;
};

type ApiResponse = {
  users: SimpleUser[];
  totalScanned: number;
  tookMs: number;
  error?: string;
};

export default function Page() {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounce query
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch when debounced changes
  React.useEffect(() => {
    const q = debounced;
    setError(null);
    if (q.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    fetch(`/api/users?q=${encodeURIComponent(q)}&limit=50`, {
      method: "GET",
      signal: ac.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return (await r.json()) as ApiResponse;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(String(e?.message ?? e));
        setLoading(false);
      });
    return () => ac.abort();
  }, [debounced]);

  return (
    <main>
      <SearchBox value={query} onChange={setQuery} />
      <HelperText query={query} />
      <Results data={data} loading={loading} error={error} />
    </main>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by email (min 2 chars)"
        autoFocus
        className="w-full rounded-[10px] border border-[#2b3551] bg-[#111735] px-4 py-3 text-[16px] text-[#e6e8ee] outline-none focus:ring-2 focus:ring-[#2b3551]"
      />
    </div>
  );
}

function HelperText({ query }: { query: string }) {
  const tooShort = query.trim().length > 0 && query.trim().length < 2;
  return (
    <p className="mt-2 mb-4 text-[#9aa4bf]">
      {tooShort
        ? "Type at least 2 characters to search."
        : "Tip: results are limited to 50 users."}
    </p>
  );
}

function Results({
  data,
  loading,
  error,
}: {
  data: ApiResponse | null;
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-[12px] border border-[#2b3551] bg-[#0f1530] p-4">
        <p className="m-0 text-[#ff9b9b]">Error: {error}</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="rounded-[12px] border border-[#2b3551] bg-[#0f1530] p-4 flex items-center justify-center">
        <Spinner />
        <p className="text-[#9aa4bf] ml-2">Searching...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-[12px] border border-[#2b3551] bg-[#0f1530] p-4">
        <p className="m-0 text-[#9aa4bf]">
          Enter a query to see results.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#2b3551] bg-[#0f1530] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="m-0 text-[#9aa4bf]">
          {data.users.length} matches • scanned {data.totalScanned} • {data.tookMs} ms
        </p>
      </div>
      {data.users.length === 0 ? (
        <p className="m-0 text-[#9aa4bf]">No users matched this query.</p>
      ) : (
        <ul className="grid list-none gap-[10px] p-0">
          {data.users.map((u) => (
            <li
              key={u.uid}
              className="sm:flex items-center justify-between gap-3 rounded-[10px] border border-[#1f2a4d] bg-[#0b122b] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar url={u.photoURL} name={u.displayName ?? u.email ?? u.uid} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <strong className="truncate text-[15px] text-[#eef2ff]">
                      {u.email ?? "—"}
                    </strong>
                    {u.disabled && <Badge text="disabled" />}
                  </div>
                  <div className="truncate text-[13px] text-[#9aa4bf]">
                    {u.displayName ?? "No display name"}
                  </div>
                </div>
              </div>
              <div className="text-right text-[12px] text-[#9aa4bf]">
                {u.creationTime && (
                  <div>created {formatDate(u.creationTime)}</div>
                )}
                {u.lastSignInTime && (
                  <div>last sign-in {formatDate(u.lastSignInTime)}</div>
                )}
                <div className="opacity-70">uid: {u.uid}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const size = 34;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name ?? "avatar"}
      width={size}
      height={size}
      className="rounded-[8px] object-cover"
    />
  ) : (
    <div
      aria-label="avatar"
      className="grid h-[34px] w-[34px] place-items-center rounded-[8px] bg-[#1a2347] text-[12px] font-semibold text-[#c6d0f5]"
    >
      {initials}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-violet-600 px-2 py-[2px] text-[11px] leading-snug text-white">
      {text}
    </span>
  );
}

function Spinner() {
  return (
    <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-[#3a4a7a] border-t-[#c6d0f5]" />
  );
}
