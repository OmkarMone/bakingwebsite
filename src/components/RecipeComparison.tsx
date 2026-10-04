"use client";

import { useState } from "react";
import { Check, ExternalLink, Minus, Star, X } from "lucide-react";
import type { ResearchResult, ScoredRecipe } from "@/lib/types";
import { Badge } from "./ui";

const ROLE_LABEL: Record<NonNullable<ScoredRecipe["role"]>, { label: string; tone: "dark" | "good" | "warn" | "neutral" }> = {
  primary: { label: "Top pick", tone: "dark" },
  supporting: { label: "Good match", tone: "good" },
  technique_reference: { label: "Technique only", tone: "warn" },
  not_used: { label: "Not used", tone: "neutral" },
};

function YesNo({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Minus className="h-4 w-4 text-cocoa-400" aria-label="Not applicable" />;
  return ok ? <Check className="h-4 w-4 text-pistachio-500" aria-label="Yes" /> : <X className="h-4 w-4 text-berry-500" aria-label="No" />;
}

/** Side-by-side comparison of every recipe we researched. All numbers come from the source pages. */
export function RecipeComparison({ result }: { result: ResearchResult }) {
  const [showAll, setShowAll] = useState(false);
  const req = result.requirements;
  const rows = showAll ? result.sources : result.sources.slice(0, 6);
  const dietCol = req.vegan ? "Vegan" : req.eggless ? "Eggless" : req.glutenFree ? "Gluten-free" : req.dairyFree ? "Dairy-free" : null;
  const dietOk = (s: ScoredRecipe) =>
    req.vegan ? !s.flags.containsAnimal : req.eggless ? !s.flags.containsEgg : req.glutenFree ? !s.flags.containsGluten : req.dairyFree ? !s.flags.containsDairy : null;

  return (
    <div>
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-b border-cream-200 text-[11px] uppercase tracking-wide text-cocoa-400">
              <th className="py-2 pr-3 font-semibold">Source</th>
              <th className="px-2 py-2 text-right font-semibold">Rating</th>
              <th className="px-2 py-2 text-right font-semibold">Reviews</th>
              {dietCol && <th className="px-2 py-2 text-center font-semibold">{dietCol}</th>}
              <th className="px-2 py-2 text-right font-semibold">Relevance</th>
              <th className="px-2 py-2 text-right font-semibold">Score</th>
              <th className="py-2 pl-2 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const role = ROLE_LABEL[s.role ?? "not_used"];
              return (
                <tr key={s.url} className="border-b border-cream-200/70 align-top last:border-0">
                  <td className="py-3 pr-3">
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="group inline-flex items-start gap-1 font-medium text-cocoa-800 hover:text-berry-600">
                      <span>
                        {s.sourceName}
                        <span className="block text-xs font-normal text-cocoa-400 group-hover:text-berry-500">{s.title}</span>
                      </span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-50" aria-hidden />
                    </a>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">
                    {s.rating != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-caramel-400 text-caramel-400" aria-hidden />
                        {s.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-cocoa-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">{s.reviewCount != null ? s.reviewCount.toLocaleString() : <span className="text-cocoa-400">—</span>}</td>
                  {dietCol && (
                    <td className="px-2 py-3">
                      <div className="flex justify-center"><YesNo ok={dietOk(s)} /></div>
                    </td>
                  )}
                  <td className="px-2 py-3 text-right tabular-nums">{s.relevancePct}%</td>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums">{s.score}</td>
                  <td className="py-3 pl-2">
                    <Badge tone={role.tone}>{role.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-cocoa-400">
        <p>
          Ratings and review counts are read from each page&apos;s published recipe data. Score is
          out of 100 (reliability 20 · rating 12 · reviews 10 · detail 10 · ingredients 8 · technique 10 · relevance 25 · evidence 5).
        </p>
        {result.sources.length > 6 && (
          <button className="font-semibold text-cocoa-600 underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${result.sources.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
