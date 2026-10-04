"use client";

import { ExternalLink, Star } from "lucide-react";
import type { ResearchResult } from "@/lib/types";
import { Badge } from "./ui";

export function SourcesList({ result }: { result: ResearchResult }) {
  const ai = new Map(result.recipe.sourceComparison.map((c) => [c.url, c]));
  const used = result.sources.filter((s) => s.role && s.role !== "not_used");
  const others = result.sources.filter((s) => !s.role || s.role === "not_used");

  return (
    <div className="space-y-5">
      <p className="text-sm text-cocoa-500">
        This recipe was developed by comparing the techniques, ratios and methods used across the sources below. It is not a copy of any single
        recipe — please visit and credit the original authors.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {used.map((s) => {
          const a = ai.get(s.url);
          return (
            <li key={s.url} className="rounded-2xl border border-cream-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-cocoa-800 hover:text-berry-600">
                  {s.sourceName} <ExternalLink className="inline h-3 w-3 opacity-50" aria-hidden />
                </a>
                {s.rating != null && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-cocoa-500">
                    <Star className="h-3 w-3 fill-caramel-400 text-caramel-400" aria-hidden />
                    {s.rating.toFixed(1)} {s.reviewCount != null && `(${s.reviewCount.toLocaleString()})`}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-cocoa-500">
                {s.title}
                {s.author && ` · by ${s.author}`}
                {s.datePublished && ` · ${new Date(s.datePublished).toString() !== "Invalid Date" ? new Date(s.datePublished).getFullYear() : s.datePublished}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.recipeYield && <Badge>Yield: {s.recipeYield}</Badge>}
                {s.panSize && <Badge>Pan: {s.panSize}</Badge>}
                {s.ovenTempC && <Badge>{s.ovenTempC}°C</Badge>}
                {s.cookMinutes && <Badge>Bake {s.cookMinutes} min</Badge>}
              </div>
              {a?.whatWeTook && <p className="mt-2 text-xs leading-relaxed text-cocoa-600"><strong className="font-semibold">What we used:</strong> {a.whatWeTook}</p>}
              {s.notes.length > 0 && <p className="mt-1 text-[11px] text-cocoa-400">{s.notes.join(" · ")}</p>}
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <details className="rounded-2xl border border-cream-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-cocoa-700">Also researched but not used ({others.length})</summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {others.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-cocoa-700 hover:text-berry-600">
                  {s.sourceName} — {s.title}
                </a>
                <span className="text-xs text-cocoa-400"> · score {s.score}{s.notes[0] ? ` · ${s.notes[0]}` : ""}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {result.rejected.length > 0 && (
        <details className="rounded-2xl border border-cream-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-cocoa-700">Pages we skipped ({result.rejected.length})</summary>
          <ul className="mt-3 space-y-1 text-xs text-cocoa-500">
            {result.rejected.map((r) => (
              <li key={r.url} className="break-words">
                <span className="font-medium text-cocoa-600">{r.domain}</span> — {r.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-[11px] text-cocoa-400">
        Search provider: {result.searchProvider} · Queries: {result.queries.join(" · ")} · Researched {new Date(result.researchedAt).toLocaleString()}
      </p>
    </div>
  );
}
