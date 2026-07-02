"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface SearchResult {
  id: string;
  title: string;
  category?: string;
  type: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 150);
    return () => clearTimeout(t);
  }, [query, search]);

  const go = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/releases/${id}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 border border-titan-border rounded-md hover:border-zinc-600 bg-titan-bg/80"
      >
        <Search className="w-3.5 h-3.5" />
        {t("app.searchPlaceholder")}
        <kbd className="ml-4 text-[10px] px-1 py-0.5 rounded bg-titan-surface border border-titan-border">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl mx-4 bg-titan-surface border border-titan-border rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-titan-border">
              <Search className="w-4 h-4 text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Artists, events, Pokémon, sneakers, venues..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
              />
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-zinc-500" /></button>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {loading && <div className="p-4 text-xs text-zinc-500">Searching...</div>}
              {!loading && query && results.length === 0 && (
                <div className="p-4 text-xs text-zinc-500">No results for &quot;{query}&quot;</div>
              )}
              {results.map((r) => (
                <button key={r.id} onClick={() => go(r.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/5 border-b border-titan-border/40 last:border-0">
                  <div className="text-sm text-zinc-200">{r.title}</div>
                  <div className="text-[10px] text-zinc-500">{r.category} · {r.type}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
