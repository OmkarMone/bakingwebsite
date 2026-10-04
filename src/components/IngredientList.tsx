"use client";

import { useState } from "react";
import { Replace } from "lucide-react";
import type { CakeRequirements, RecipeIngredient } from "@/lib/types";
import { formatGrams, formatMl } from "@/lib/calc/units";
import { SubstitutionPanel } from "./SubstitutionPanel";

export function IngredientList({
  ingredients,
  req,
  factor,
}: {
  ingredients: RecipeIngredient[];
  req: CakeRequirements;
  factor: number;
}) {
  const [subFor, setSubFor] = useState<RecipeIngredient | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const groups = [...new Set(ingredients.map((i) => i.group))];

  return (
    <div>
      {factor !== 1 && (
        <p className="mb-3 rounded-xl bg-caramel-100 px-3 py-2 text-xs font-medium text-caramel-600">
          Scaled ×{factor.toFixed(2)} — quantities below are adjusted. Baking time may change.
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-berry-500">{g}</h3>
            <ul className="divide-y divide-cream-200">
              {ingredients
                .filter((i) => i.group === g)
                .map((i, idx) => {
                  const key = `${g}-${idx}-${i.name}`;
                  const done = checked.has(key);
                  const primary = i.grams != null ? formatGrams(i.grams) : i.ml != null ? formatMl(i.ml) : i.householdMeasure ?? "";
                  const secondary = [i.grams != null && i.ml != null ? formatMl(i.ml) : null, i.grams != null || i.ml != null ? i.householdMeasure : null].filter(Boolean).join(" · ");
                  return (
                    <li key={key} className="group flex items-start gap-3 py-2.5">
                      <input
                        type="checkbox"
                        className="no-print mt-1 h-4 w-4 shrink-0 accent-cocoa-700"
                        checked={done}
                        aria-label={`Mark ${i.name} as measured`}
                        onChange={() =>
                          setChecked((s) => {
                            const n = new Set(s);
                            if (n.has(key)) n.delete(key);
                            else n.add(key);
                            return n;
                          })
                        }
                      />
                      <div className={`min-w-0 flex-1 ${done ? "text-cocoa-400 line-through" : ""}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-sm font-medium text-cocoa-800">{i.name}</span>
                          <span className="text-sm font-semibold tabular-nums text-cocoa-800">{primary}</span>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-cocoa-400">
                          <span>{i.notes}</span>
                          <span className="tabular-nums">{secondary}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubFor(i)}
                        className="no-print shrink-0 rounded-full p-1.5 text-cocoa-400 transition hover:bg-caramel-100 hover:text-caramel-600"
                        title="I don't have this ingredient"
                        aria-label={`I don't have ${i.name} — show substitutes`}
                      >
                        <Replace className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <p className="no-print mt-3 text-xs text-cocoa-400">
        Tap <Replace className="inline h-3 w-3" aria-hidden /> next to any ingredient if you don&apos;t have it.
      </p>
      {subFor && <SubstitutionPanel ingredient={subFor} req={req} onClose={() => setSubFor(null)} />}
    </div>
  );
}
