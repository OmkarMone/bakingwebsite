"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import type { ProgressStep } from "@/lib/types";

export type StepState = { status: "pending" | "active" | "done" | "skipped"; detail?: string };

const LABELS: Record<ProgressStep, string> = {
  requirements: "Understanding your requirements",
  library: "Checking our curated recipe library",
  search: "Searching the web (only if needed)",
  extract: "Reading published recipe data",
  compare: "Ranking recipes",
  validate: "Scaling, checking quantities & preparing your recipe",
};

export function ResearchProgress({ steps, title, onCancel }: { steps: Record<ProgressStep, StepState>; title: string; onCancel: () => void }) {
  const order = Object.keys(LABELS) as ProgressStep[];
  return (
    <section className="mx-auto max-w-xl pt-14" aria-live="polite">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-caramel-100">
            <Loader2 className="h-6 w-6 animate-spin text-caramel-600" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-cocoa-800">Finding your recipe…</h1>
            <p className="text-sm text-cocoa-400">for {title}</p>
          </div>
        </div>
        <ol className="space-y-4">
          {order.map((k) => {
            const s = steps[k];
            return (
              <li key={k} className="flex items-start gap-3">
                <span className="mt-0.5">
                  {s.status === "done" ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-pistachio-500 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : s.status === "active" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-caramel-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-cream-300" />
                  )}
                </span>
                <div>
                  <p className={`text-sm font-medium ${s.status === "pending" || s.status === "skipped" ? "text-cocoa-400" : "text-cocoa-800"}`}>
                    {LABELS[k]}
                    {s.status === "skipped" && <span className="ml-1.5 text-xs font-normal">— not needed</span>}
                  </p>
                  {s.detail && <p className="text-xs text-cocoa-400">{s.detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 flex justify-end">
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-cocoa-400">
        If we search the web, we only read pages whose robots.txt allows it, using the recipe data publishers provide to search engines.
      </p>
    </section>
  );
}
