"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Scale } from "lucide-react";
import type { RecipeIngredient } from "@/lib/types";
import {
  PAN_PRESETS,
  bakingAdjustmentAdvice,
  findPan,
  roundPan,
  scaleFactorForPan,
  scaleFactorForWeight,
  scaleIngredients,
  type Pan,
} from "@/lib/calc/recipeScaler";
import { cToF, formatGrams, formatMl } from "@/lib/calc/units";
import { ApproxBadge, ChipGroup, NumberField, num } from "./fields";

const WEIGHT_PRESETS = [500, 750, 1000, 1500, 2000];

export interface ScalingCalculatorProps {
  ingredients: RecipeIngredient[];
  basePan?: Pan | null;
  baseWeightG: number;
  baseBakeMin: number;
  baseBakeMax: number;
  ovenTempC: number;
  onScaled?: (scaled: RecipeIngredient[], factor: number) => void;
  /** Compact: controls + advice only (the parent renders the scaled list) */
  compact?: boolean;
}

type Mode = "weight" | "pan";

export function ScalingCalculator({
  ingredients,
  basePan,
  baseWeightG,
  baseBakeMin,
  baseBakeMax,
  ovenTempC,
  onScaled,
  compact = false,
}: ScalingCalculatorProps) {
  const [mode, setMode] = useState<Mode>("weight");
  const [targetWeight, setTargetWeight] = useState<number | "">(Math.round(baseWeightG));
  const [panId, setPanId] = useState<string>(basePan?.id && findPan(basePan.id) ? basePan.id : basePan ? "custom" : "round-8");
  const [customDiameter, setCustomDiameter] = useState<number | "">(basePan?.diameterIn ?? 8);
  const [customDepth, setCustomDepth] = useState<number | "">(basePan?.depthIn ?? 2);

  const fromPan: Pan = basePan ?? findPan("round-8")!;
  const toPan: Pan = useMemo(() => {
    if (panId === "custom") return roundPan(num(customDiameter, 8), num(customDepth, 2));
    return findPan(panId) ?? fromPan;
  }, [panId, customDiameter, customDepth, fromPan]);

  const factor = useMemo(() => {
    if (mode === "pan") return scaleFactorForPan(fromPan, toPan);
    const t = num(targetWeight, baseWeightG);
    return scaleFactorForWeight(baseWeightG, Math.min(10000, Math.max(100, t)));
  }, [mode, fromPan, toPan, targetWeight, baseWeightG]);

  const scaled = useMemo(() => scaleIngredients(ingredients, factor), [ingredients, factor]);
  const advice = useMemo(
    () => bakingAdjustmentAdvice(fromPan, toPan, factor, baseBakeMin, baseBakeMax, ovenTempC),
    [fromPan, toPan, factor, baseBakeMin, baseBakeMax, ovenTempC],
  );

  // Notify parent without re-running on every parent render
  const onScaledRef = useRef(onScaled);
  useEffect(() => {
    onScaledRef.current = onScaled;
  }, [onScaled]);
  useEffect(() => {
    onScaledRef.current?.(scaled, factor);
  }, [scaled, factor]);

  const resultWeight = Math.round(baseWeightG * factor);
  const panChanged = toPan.id !== fromPan.id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChipGroup<Mode>
          options={[
            { value: "weight", label: "Scale by cake weight" },
            { value: "pan", label: "Scale to a new pan" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <ApproxBadge />
      </div>

      {mode === "weight" && (
        <div className="space-y-3">
          <ChipGroup<number>
            label="Target weight"
            options={WEIGHT_PRESETS.map((w) => ({ value: w, label: formatGrams(w) }))}
            value={WEIGHT_PRESETS.includes(num(targetWeight, -1)) ? num(targetWeight, -1) : null}
            onChange={setTargetWeight}
          />
          <div className="max-w-xs">
            <NumberField
              label="Custom weight"
              value={targetWeight}
              onChange={setTargetWeight}
              min={100}
              max={10000}
              step={50}
              suffix="g"
              hint={`Original recipe ≈ ${formatGrams(baseWeightG)}`}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="scaler-pan">
            {mode === "pan" ? "New pan" : "Pan you'll bake in"}
          </label>
          <select id="scaler-pan" className="input" value={panId} onChange={(e) => setPanId(e.target.value)}>
            {PAN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.id === fromPan.id ? " — recipe's pan" : ""}
              </option>
            ))}
            <option value="custom">Custom round pan…</option>
          </select>
        </div>
        {panId === "custom" && (
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <NumberField label="Diameter" value={customDiameter} onChange={setCustomDiameter} min={3} max={16} step={0.5} suffix="in" />
            <NumberField label="Pan height" value={customDepth} onChange={setCustomDepth} min={1} max={6} step={0.5} suffix="in" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Box label="Scale factor" value={`× ${factor.toFixed(2)}`} />
        <Box label="Approx. cake weight" value={formatGrams(resultWeight)} />
        <Box label="Oven" value={`${advice.tempC} °C / ${cToF(advice.tempC)} °F`} />
        <Box label="Bake time" value={`${advice.bakeMinutesMin}–${advice.bakeMinutesMax} min`} />
      </div>

      {(advice.warnings.length > 0 || panChanged) && (
        <div className="rounded-2xl border border-caramel-300 bg-caramel-100/60 px-4 py-3 text-sm text-cocoa-700">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Baking time may change
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {panChanged && <li>You changed the pan size — bake time and temperature are estimates, not tested values.</li>}
            {advice.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <div className="overflow-hidden rounded-2xl border border-cream-200">
          <div className="flex items-center gap-2 bg-cream-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-cocoa-500">
            <Scale className="h-4 w-4" aria-hidden /> Scaled ingredients
          </div>
          <ul className="divide-y divide-cream-200">
            {scaled.map((i, idx) => (
              <li key={`${i.name}-${idx}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
                <span className="text-cocoa-700">
                  {i.name}
                  {i.notes && <span className="block text-[11px] text-cocoa-400">{i.notes}</span>}
                </span>
                <span className="text-right font-medium text-cocoa-800">
                  {i.grams != null ? formatGrams(i.grams) : i.ml != null ? formatMl(i.ml) : ""}
                  {i.householdMeasure && <span className="ml-2 text-xs font-normal text-cocoa-400">({i.householdMeasure})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-cocoa-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-cocoa-800">{value}</div>
    </div>
  );
}
