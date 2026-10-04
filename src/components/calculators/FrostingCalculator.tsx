"use client";

import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import {
  FROSTING_LABELS,
  FROSTING_TYPES,
  calculateFrosting,
  type FrostingType,
  type PipingLevel,
} from "@/lib/calc/frostingCalculator";
import { formatGrams } from "@/lib/calc/units";
import { ApproxBadge, ChipGroup, NumberField, num } from "./fields";

export interface FrostingCalculatorProps {
  defaultType?: FrostingType;
  defaultDiameterIn?: number;
  defaultHeightIn?: number;
  defaultLayers?: number;
  compact?: boolean;
}

export function FrostingCalculator({
  defaultType = "buttercream",
  defaultDiameterIn = 8,
  defaultHeightIn = 4,
  defaultLayers = 2,
  compact = false,
}: FrostingCalculatorProps) {
  const [type, setType] = useState<FrostingType>(defaultType);
  const [diameter, setDiameter] = useState<number | "">(defaultDiameterIn);
  const [height, setHeight] = useState<number | "">(defaultHeightIn);
  const [layers, setLayers] = useState<number | "">(defaultLayers);
  const [shape, setShape] = useState<"round" | "square">("round");
  const [piping, setPiping] = useState<PipingLevel>("light");

  const result = useMemo(
    () =>
      calculateFrosting({
        type,
        diameterIn: num(diameter, defaultDiameterIn),
        heightIn: num(height, defaultHeightIn),
        layers: num(layers, defaultLayers),
        shape,
        piping,
      }),
    [type, diameter, height, layers, shape, piping, defaultDiameterIn, defaultHeightIn, defaultLayers],
  );

  const rows: { label: string; grams: number; hint: string }[] = [
    { label: "Filling", grams: result.grams.filling, hint: `${result.geometry.fillingLayers} layer${result.geometry.fillingLayers === 1 ? "" : "s"} between cakes` },
    { label: "Crumb coat", grams: result.grams.crumbCoat, hint: "thin sealing coat" },
    { label: "Final coat", grams: result.grams.finalCoat, hint: "smooth outer layer" },
    { label: "Piping", grams: result.grams.piping, hint: piping === "none" ? "no piping" : `${piping} decoration` },
    { label: "Extra for waste", grams: result.grams.waste, hint: "+10% bowl & bag losses" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="label">Frosting type</span>
          <div className="flex flex-wrap gap-2">
            {FROSTING_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${type === t ? "chip-active" : ""}`}
                aria-pressed={type === t}
                onClick={() => setType(t)}
              >
                {FROSTING_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <ApproxBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberField label={shape === "round" ? "Diameter" : "Side length"} value={diameter} onChange={setDiameter} min={3} max={16} step={0.5} suffix="in" />
        <NumberField label="Total cake height" value={height} onChange={setHeight} min={1} max={12} step={0.5} suffix="in" />
        <NumberField label="Cake layers" value={layers} onChange={setLayers} min={1} max={8} />
      </div>

      <div className="flex flex-wrap gap-5">
        <ChipGroup<"round" | "square">
          label="Shape"
          options={[
            { value: "round", label: "Round" },
            { value: "square", label: "Square" },
          ]}
          value={shape}
          onChange={setShape}
        />
        <ChipGroup<PipingLevel>
          label="Piping / decoration"
          options={[
            { value: "none", label: "None" },
            { value: "light", label: "Light" },
            { value: "heavy", label: "Heavy" },
          ]}
          value={piping}
          onChange={setPiping}
        />
      </div>

      <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
        <div className="rounded-2xl border border-cream-200 bg-white">
          <ul className="divide-y divide-cream-200">
            {rows.map((r) => (
              <li key={r.label} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-cocoa-700">
                  {r.label}
                  <span className="block text-[11px] text-cocoa-400">{r.hint}</span>
                </span>
                <span className="font-medium text-cocoa-800">{formatGrams(r.grams)}</span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 bg-cocoa-700 px-4 py-3 text-cream-50">
              <span className="text-sm font-semibold">Total {result.label.toLowerCase()}</span>
              <span className="text-lg font-semibold">≈ {formatGrams(result.grams.total)}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cocoa-500">
            Batch to make (≈ {formatGrams(result.grams.total)})
          </p>
          <ul className="space-y-1.5 text-sm">
            {result.recipe.map((r) => (
              <li key={r.name} className="flex items-baseline justify-between gap-3">
                <span className="text-cocoa-700">
                  {r.name}
                  {r.note && <span className="block text-[11px] text-cocoa-400">{r.note}</span>}
                </span>
                <span className="shrink-0 font-medium text-cocoa-800">{formatGrams(r.grams)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!compact && (
        <div className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-cocoa-600">
          <p className="mb-1.5 flex items-center gap-2 font-semibold text-cocoa-700">
            <Lightbulb className="h-4 w-4 text-caramel-500" aria-hidden /> Tips for {result.label.toLowerCase()}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {result.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-cocoa-400">
        Estimates use typical coating thicknesses (filling ≈ 5–10 mm, crumb coat ≈ 1.5 mm, final coat ≈ 4 mm). Real usage varies with technique.
      </p>
    </div>
  );
}
