"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  TROUBLESHOOTING,
  TROUBLE_CATEGORY_LABELS,
  type TroubleCategory,
} from "@/lib/content/troubleshooting";

export interface TroubleshootingProps {
  compact?: boolean;
  limitIds?: string[];
}

type Filter = "all" | TroubleCategory;

export function Troubleshooting({ compact = false, limitIds }: TroubleshootingProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const base = useMemo(
    () => (limitIds?.length ? TROUBLESHOOTING.filter((t) => limitIds.includes(t.id)) : TROUBLESHOOTING),
    [limitIds],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter((t) => {
      if (filter !== "all" && t.category !== filter) return false;
      if (!q) return true;
      const hay = [t.title, t.symptoms, ...t.likelyCauses.map((c) => `${c.cause} ${c.explanation}`), ...t.fixes, ...t.prevention]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [base, query, filter]);

  const filters: Filter[] = ["all", "cake", "frosting", "equipment"];

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search problems</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" aria-hidden />
            <input
              className="input pl-10"
              placeholder="Search: sank, dry, ganache, air fryer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                className={`chip ${filter === f ? "chip-active" : ""}`}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : TROUBLE_CATEGORY_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl bg-cream-100 px-4 py-6 text-center text-sm text-cocoa-500">
          No matching problems. Try a different word, like &ldquo;flat&rdquo; or &ldquo;melted&rdquo;.
        </p>
      ) : (
        <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
          {items.map((t) => (
            <details key={t.id} id={t.id} className="group card scroll-mt-24 overflow-hidden">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-sm font-semibold text-cocoa-800">{t.title}</span>
                  <span className="mt-0.5 block text-xs text-cocoa-400">{t.symptoms}</span>
                </span>
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-cocoa-400 transition group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-4 border-t border-cream-200 px-5 py-4 text-sm">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-berry-500">Likely causes</p>
                  <ul className="space-y-1.5">
                    {t.likelyCauses.map((c) => (
                      <li key={c.cause} className="text-cocoa-600">
                        <span className="font-medium text-cocoa-800">{c.cause}.</span> {c.explanation}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-caramel-600">Rescue it</p>
                  <ul className="list-disc space-y-1 pl-5 text-cocoa-600">
                    {t.fixes.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-pistachio-700">Next time</p>
                  <ul className="list-disc space-y-1 pl-5 text-cocoa-600">
                    {t.prevention.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
