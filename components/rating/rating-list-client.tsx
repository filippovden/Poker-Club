"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/reveal";
import type { Player } from "@/lib/db/schema";

const PAGE_SIZE = 20;

export function RatingListClient({ players }: { players: Player[] }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, query]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div>
      <div className="relative mb-6 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Поиск по имени"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted-foreground)]">
          Никого не нашли.
        </p>
      ) : (
        <>
          <RevealGroup className="overflow-hidden rounded-xl border border-[var(--border)]">
            {visible.map((p) => {
              const i = players.indexOf(p);
              return (
                <RevealItem key={p.id}>
                  <Link
                    href={`/rating/${p.id}`}
                    className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 last:border-0 hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-6 shrink-0 text-sm font-semibold text-[var(--muted-foreground)]">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Турниров: {p.tournamentsPlayed}
                        </p>
                      </div>
                    </div>
                    <span className="font-display text-lg font-medium text-[var(--accent)]">
                      {Math.round(p.rating)}
                    </span>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
          {visibleCount < filtered.length && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                Показать ещё
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
