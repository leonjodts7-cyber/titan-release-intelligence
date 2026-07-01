"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { ReleaseFilters } from "@/types";

interface SearchBarProps {
  onSearch: (filters: ReleaseFilters) => void;
  initialFilters?: ReleaseFilters;
}

export function SearchBar({ onSearch, initialFilters }: SearchBarProps) {
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [priority, setPriority] = useState(initialFilters?.priority ?? "");
  const [sort, setSort] = useState<ReleaseFilters["sort"]>(initialFilters?.sort ?? "priority");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      search: search || undefined,
      priority: (priority as ReleaseFilters["priority"]) || undefined,
      sort,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search releases..."
          className="w-full pl-9 pr-3 py-2 bg-titan-surface border border-titan-border rounded-lg text-sm focus:outline-none focus:border-titan-accent"
        />
      </div>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="px-3 py-2 bg-titan-surface border border-titan-border rounded-lg text-sm focus:outline-none"
      >
        <option value="">All priorities</option>
        <option value="EXTREME">EXTREME</option>
        <option value="HIGH">HIGH</option>
        <option value="MEDIUM">MEDIUM</option>
        <option value="LOW">LOW</option>
      </select>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as ReleaseFilters["sort"])}
        className="px-3 py-2 bg-titan-surface border border-titan-border rounded-lg text-sm focus:outline-none"
      >
        <option value="priority">Sort: Priority</option>
        <option value="date">Sort: Date</option>
        <option value="hype">Sort: Hype</option>
        <option value="sellout">Sort: Sellout</option>
      </select>
      <button
        type="submit"
        className="px-4 py-2 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Search
      </button>
    </form>
  );
}
