"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { CakeRequirements, RecipeIngredient } from "@/lib/types";
import { findSubstitutions, type SubstitutionResult } from "@/lib/content/substitutions";
import { Badge, Callout } from "./ui";

type Sub = Pick<SubstitutionResult, "substitutes" | "recommendedIndex" | "warnings"> & { ingredient?: string };

const IMPACT_TONE = { minimal: "good", noticeable: "warn", significant: "bad" } as const;

export function SubstitutionPanel({
  ingredient,
  req,
  onClose,
}: {
  ingredient: RecipeIngredient;
  req: CakeRequirements;
  onClose: () => void;
}) {
  const diet = { eggless: req.eggless ?? undefined, vegan: req.vegan ?? undefined, dairyFree: req.dairyFree ?? undefined, glutenFree: req.glutenFree ?? undefined };
  const local = findSubstitutions(ingredient.name, { grams: ingredient.grams, ml: ingredient.ml, ...diet });
  const result: Sub | null = local;

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

        {!result && (
          <Callout tone="info">
            We don&apos;t have tested substitutes for “{ingredient.name}” yet — we&apos;d rather say so than guess. Check the{" "}
            <a href="/troubleshooting" className="underline">troubleshooting guide</a> or keep the original ingredient for best results.
          </Callout>
        )}

        {result && (
          <div className="space-y-3">
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
