"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Sparkles, X } from "lucide-react";
import type { CakeRequirements, RecipeIngredient } from "@/lib/types";
import { findSubstitutions, type SubstitutionResult } from "@/lib/content/substitutions";
import { api } from "@/lib/client/api";
import { Badge, Callout } from "./ui";

type Sub = Pick<SubstitutionResult, "substitutes" | "recommendedIndex" | "warnings"> & { ingredient?: string };

const IMPACT_TONE = { minimal: "good", noticeable: "warn", significant: "bad" } as const;

export function SubstitutionPanel({
  ingredient,
  req,
  recipeName,
  allIngredients,
  onClose,
}: {
  ingredient: RecipeIngredient;
  req: CakeRequirements;
  recipeName: string;
  allIngredients: RecipeIngredient[];
  onClose: () => void;
}) {
  const diet = { eggless: req.eggless ?? undefined, vegan: req.vegan ?? undefined, dairyFree: req.dairyFree ?? undefined, glutenFree: req.glutenFree ?? undefined };
  const local = findSubstitutions(ingredient.name, { grams: ingredient.grams, ml: ingredient.ml, ...diet });
  const [aiResult, setAiResult] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(!local);
  const [error, setError] = useState<string | null>(null);
  const result: Sub | null = local ?? aiResult;
  const source = local ? "knowledge_base" : aiResult ? "ai" : null;

  useEffect(() => {
    if (local) return;
    let cancelled = false;
    api<{ source: string; result: Sub }>("/api/substitute", {
      method: "POST",
      json: {
        ingredient: ingredient.name,
        grams: ingredient.grams,
        ml: ingredient.ml,
        role: ingredient.role,
        recipeName,
        otherIngredients: allIngredients.map((i) => i.name).slice(0, 40),
        eggless: req.eggless,
        vegan: req.vegan,
        dairyFree: req.dairyFree,
        glutenFree: req.glutenFree,
      },
    })
      .then((r) => !cancelled && setAiResult(r.result))
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredient.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream-50 p-6 shadow-lift sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-400">I don&apos;t have this ingredient</p>
            <h2 id="sub-title" className="text-xl font-semibold text-cocoa-800">{ingredient.name}</h2>
            <p className="text-xs text-cocoa-400">
              {[ingredient.grams != null && `${ingredient.grams} g`, ingredient.ml != null && `${ingredient.ml} ml`, ingredient.householdMeasure].filter(Boolean).join(" · ")} · role: {ingredient.role}
            </p>
          </div>
          <button className="btn-ghost px-2.5 py-2" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-cocoa-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Working out a substitute that keeps the chemistry balanced…
          </p>
        )}
        {error && <Callout tone="error">{error}</Callout>}

        {result && (
          <div className="space-y-3">
            {source === "ai" && (
              <p className="flex items-center gap-1.5 text-xs text-caramel-600">
                <Sparkles className="h-3.5 w-3.5" /> AI-generated — this ingredient isn&apos;t in our curated guide yet.
              </p>
            )}
            {result.substitutes.map((s, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-4 ${i === result.recommendedIndex ? "border-cocoa-700 bg-white" : "border-cream-200 bg-white/60"} ${s.dietOk === false ? "opacity-60" : ""}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {i === result.recommendedIndex && <Badge tone="dark">Recommended</Badge>}
                  <Badge tone={IMPACT_TONE[s.impact]}>{s.impact} change</Badge>
                  {s.dietOk === false && <Badge tone="bad">Conflicts with {s.dietConflicts.join(", ")}</Badge>}
                </div>
                <p className="text-sm font-medium text-cocoa-800">{s.scaledInstruction ?? s.instruction}</p>
                {s.ratioNote && <p className="mt-0.5 text-xs text-cocoa-500">{s.ratioNote}</p>}
                <p className="mt-1.5 text-xs leading-relaxed text-cocoa-600">
                  <strong className="font-semibold">Why:</strong> {s.why}
                </p>
                {s.impact === "significant" && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-berry-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This will noticeably change the texture or flavour of the cake.
                  </p>
                )}
              </div>
            ))}
            {result.warnings.length > 0 && (
              <Callout tone="warn">
                <ul className="list-disc space-y-0.5 pl-4">
                  {result.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </Callout>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
