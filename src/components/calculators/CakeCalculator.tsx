"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { CAKE_STYLES, CAKE_STYLE_LABELS, calculateCake, type CakeStyle } from "@/lib/calc/cakeCalculator";
import { formatGrams, inToCm } from "@/lib/calc/units";
import { ApproxBadge, NumberField, num } from "./fields";

export function CakeCalculator() {
  const [style, setStyle] = useState<CakeStyle>("eggless_chocolate");
  const [weight, setWeight] = useState<number | "">(1000);
  const [diameter, setDiameter] = useState<number | "">(8);
  const [height, setHeight] = useState<number | "">(3);
  const [layers, setLayers] = useState<number | "">(1);
  const [servings, setServings] = useState<number | "">("");

  const r = useMemo(
    () =>
      calculateCake({
        cakeStyle: style,
        desiredWeightG: weight === "" ? null : weight,
        panDiameterIn: num(diameter, 8),
        panHeightIn: num(height, 2),
        layers: num(layers, 1),
        desiredServings: servings === "" ? null : servings,
      }),
    [style, weight, diameter, height, layers, servings],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="cake-style">
            Cake style
          </label>
          <select id="cake-style" className="input" value={style} onChange={(e) => setStyle(e.target.value as CakeStyle)}>
            {CAKE_STYLES.map((s) => (
              <option key={s} value={s}>
                {CAKE_STYLE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Desired cake weight" value={weight} onChange={setWeight} min={150} max={10000} step={50} suffix="g" placeholder="optional" />
          <NumberField label="Desired servings" value={servings} onChange={setServings} min={1} max={300} placeholder="optional" />
          <NumberField label="Pan diameter" value={diameter} onChange={setDiameter} min={3} max={16} step={0.5} suffix="in" hint={`${inToCm(num(diameter, 8))} cm`} />
          <NumberField label="Pan height" value={height} onChange={setHeight} min={1} max={6} step={0.5} suffix="in" hint={`${inToCm(num(height, 2))} cm`} />
          <NumberField label="Number of layers (pans)" value={layers} onChange={setLayers} min={1} max={6} />
        </div>
        <p className="flex gap-2 text-xs text-cocoa-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Leave weight and servings empty to see how much batter your pans hold. Weight takes priority over servings.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-cocoa-800">Results</h3>
          <ApproxBadge />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Box label="Total batter" value={formatGrams(r.batterTotalG)} />
          <Box label="Batter per pan" value={formatGrams(r.batterPerPanG)} />
          <Box label="Finished cake" value={`≈ ${formatGrams(r.estimatedFinishedWeightG)}`} />
          <Box label="Oven" value={`${r.ovenTempC} °C / ${r.ovenTempF} °F`} />
          <Box label="Bake time" value={`${r.bakeMinutesMin}–${r.bakeMinutesMax} min`} />
          <Box label="Servings" value={`${r.servings.party} party · ${r.servings.wedding} wedding`} />
        </div>
        <p className="text-[11px] text-cocoa-400">
          Pans hold ≈ {formatGrams(r.panCapacityBatterG)} batter at ~{Math.round(r.fillFraction * 100)}% fill. Batter depth ≈{" "}
          {r.batterDepthIn}&quot;. Party slice ≈ 1.5×2×4 in, wedding slice ≈ 1×2×4 in. Conventional oven; for fan ovens reduce by 15–20 °C.
        </p>

        {r.recommendedPans.length > 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cocoa-500">Pan setups that fit this batter</p>
            <div className="flex flex-wrap gap-2">
              {r.recommendedPans.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setDiameter(p.diameterIn);
                    setHeight(p.heightIn);
                    setLayers(p.layers);
                  }}
                >
                  {p.label} · {Math.round(p.fillRatio * 100)}%
                </button>
              ))}
            </div>
          </div>
        )}

        {r.notes.length > 0 && (
          <ul className="list-disc space-y-1 rounded-2xl bg-cream-100 py-3 pl-9 pr-4 text-sm text-cocoa-600">
            {r.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white">
          <div className="bg-cream-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-cocoa-500">
            Approximate ingredients — {CAKE_STYLE_LABELS[style]} base formula
          </div>
          <ul className="divide-y divide-cream-200">
            {r.ingredients.map((i) => (
              <li key={i.name} className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-2.5 text-sm">
                <span className="text-cocoa-700">
                  {i.name}
                  {i.notes && <span className="ml-1 text-[11px] text-cocoa-400">({i.notes})</span>}
                </span>
                <span className="font-medium text-cocoa-800">
                  {formatGrams(i.grams)}
                  {i.householdMeasure && <span className="ml-2 text-xs font-normal text-cocoa-400">{i.householdMeasure}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-cream-200 px-4 py-2.5 text-[11px] text-cocoa-400">
            Generic baker&apos;s-percentage formula for planning quantities — for a tested, researched recipe use “Find a recipe”.
          </p>
        </div>
      </div>
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
