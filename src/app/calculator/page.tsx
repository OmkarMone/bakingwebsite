import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { CalculatorTabs } from "@/components/calculators/CalculatorTabs";

export const metadata: Metadata = {
  title: "Cake & frosting calculators",
  description: "Estimate batter, servings, bake time, frosting quantities and scale recipes between pan sizes.",
};

export default function CalculatorPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Calculators"
        title="Plan your cake with confidence"
        subtitle="Work out batter for any pan, how much frosting you need, and how to scale a recipe to a new size. All results are approximate — always check doneness."
      />
      <Suspense fallback={<div className="card p-6 text-sm text-cocoa-400">Loading calculators…</div>}>
        <CalculatorTabs />
      </Suspense>
    </div>
  );
}
