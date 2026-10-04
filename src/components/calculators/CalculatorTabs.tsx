"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calculator, CakeSlice, Scale } from "lucide-react";
import { calculateCake } from "@/lib/calc/cakeCalculator";
import { findPan } from "@/lib/calc/recipeScaler";
import { CakeCalculator } from "./CakeCalculator";
import { FrostingCalculator } from "./FrostingCalculator";
import { ScalingCalculator } from "./ScalingCalculator";

const TABS = [
  { id: "cake", label: "Cake calculator", icon: Calculator },
  { id: "frosting", label: "Frosting calculator", icon: CakeSlice },
  { id: "scale", label: "Pan & recipe scaler", icon: Scale },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function CalculatorTabs() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("tab");
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "cake";

  // Example recipe for the standalone scaler: 1 kg eggless chocolate cake in an 8" × 3" pan
  const demo = useMemo(
    () => calculateCake({ desiredWeightG: 1000, panDiameterIn: 8, panHeightIn: 3, layers: 1, cakeStyle: "eggless_chocolate" }),
    [],
  );

  const select = (id: TabId) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Calculators">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => select(t.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                active ? "bg-cocoa-700 text-cream-50 shadow-card" : "bg-cream-50 text-cocoa-600 hover:bg-cream-200"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="card p-5 sm:p-7">
        {tab === "cake" && <CakeCalculator />}
        {tab === "frosting" && <FrostingCalculator />}
        {tab === "scale" && (
          <div className="space-y-4">
            <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-cocoa-600">
              <span className="font-semibold text-cocoa-700">Example recipe:</span> a 1 kg eggless chocolate cake (generic base formula) baked in an 8&quot; × 3&quot; pan.
              Open any researched recipe to scale it the same way.
            </p>
            <ScalingCalculator
              ingredients={demo.ingredients}
              basePan={findPan("round-8-tall")}
              baseWeightG={demo.estimatedFinishedWeightG}
              baseBakeMin={demo.bakeMinutesMin}
              baseBakeMax={demo.bakeMinutesMax}
              ovenTempC={demo.ovenTempC}
            />
          </div>
        )}
      </section>
    </div>
  );
}
