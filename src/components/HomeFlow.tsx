"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RequirementsSchema, type CakeRequirements, type CakeRequirementsInput, type ProgressStep, type ResearchResult } from "@/lib/types";
import { lastResult, parseQuery, runResearch } from "@/lib/client/api";
import { heuristicParse } from "@/lib/requirementParser";
import { RecipeForm } from "./RecipeForm";
import { RequirementsForm } from "./RequirementsForm";
import { ResearchProgress, type StepState } from "./ResearchProgress";
import { RecipeResult } from "./RecipeResult";
import { Callout } from "./ui";

type Stage = "ask" | "requirements" | "researching" | "result";

const INITIAL_STEPS: Record<ProgressStep, StepState> = {
  requirements: { status: "pending" },
  library: { status: "pending" },
  search: { status: "pending" },
  extract: { status: "pending" },
  compare: { status: "pending" },
  validate: { status: "pending" },
};

export function HomeFlow() {
  const [stage, setStage] = useState<Stage>("ask");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CakeRequirementsInput | null>(null);
  const [parsing, setParsing] = useState(false);
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore the last result in this tab (e.g. after a refresh or coming back from another page)
  useEffect(() => {
    const prev = lastResult.load();
    if (prev) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage
      setResult(prev);
      setStage("result");
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage]);

  const handleAsk = useCallback(async (q: string) => {
    setQuery(q);
    setError(null);
    setParsing(true);
    try {
      const { requirements } = await parseQuery(q);
      setDraft(requirements);
    } catch {
      // Parsing is a convenience — fall back to the local parser rather than blocking the user
      setDraft(heuristicParse(q));
    } finally {
      setParsing(false);
      setStage("requirements");
    }
  }, []);

  const startResearch = useCallback(async (reqInput: CakeRequirementsInput, forceRefresh = false, cakeId: string | null = null) => {
    const parsed = RequirementsSchema.safeParse(reqInput);
    if (!parsed.success) {
      setError({ message: parsed.error.issues[0]?.message ?? "Please check your requirements." });
      return;
    }
    const req: CakeRequirements = parsed.data;
    setDraft(reqInput);
    setError(null);
    setSteps(INITIAL_STEPS);
    setStage("researching");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await runResearch(
        req,
        (e) => {
          if (e.type === "progress") setSteps((s) => ({ ...s, [e.step]: { status: e.status, detail: e.detail ?? s[e.step].detail } }));
        },
        { forceRefresh, cakeId, signal: ctrl.signal },
      );
      setResult(r);
      lastResult.save(r);
      setStage("result");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const err = e as Error & { code?: string };
      setError({ message: err.message || "Research failed.", code: err.code });
      setStage("requirements");
    }
  }, []);

  const reset = () => {
    abortRef.current?.abort();
    lastResult.clear();
    setResult(null);
    setDraft(null);
    setQuery("");
    setError(null);
    setStage("ask");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      {stage === "ask" && <RecipeForm initialQuery={query} onSubmit={handleAsk} loading={parsing} />}

      {stage === "requirements" && draft && (
        <div className="pt-8">
          {error && (
            <div className="mb-6">
              <Callout tone="error" title={error.code === "not_configured" ? "Research isn't configured yet" : "We couldn't finish the research"}>
                {error.message}
              </Callout>
            </div>
          )}
          <RequirementsForm initial={draft} onBack={() => setStage("ask")} onSubmit={(r) => startResearch(r)} />
        </div>
      )}

      {stage === "researching" && (
        <ResearchProgress
          steps={steps}
          title={draft?.cakeType ?? "your cake"}
          onCancel={() => {
            abortRef.current?.abort();
            setStage("requirements");
          }}
        />
      )}

      {stage === "result" && result && (
        <RecipeResult
          result={result}
          onNewSearch={reset}
          onEditRequirements={() => {
            setDraft(result.requirements);
            setStage("requirements");
          }}
          onRefresh={result.kind === "web" ? () => startResearch(result.requirements, true) : undefined}
          onPickRecipe={(cakeId) => startResearch(result.requirements, false, cakeId)}
        />
      )}
    </div>
  );
}
