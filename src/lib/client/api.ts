"use client";

import type { CakeRequirements, CakeRequirementsInput, ResearchEvent, ResearchResult } from "@/lib/types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status, (data as { code?: string }).code);
  return data as T;
}

export const parseQuery = (query: string) =>
  api<{ requirements: CakeRequirementsInput; method: "ai" | "heuristic" }>("/api/parse", { method: "POST", json: { query } });

/** Run research and receive streamed NDJSON progress events. */
export async function runResearch(
  requirements: CakeRequirements,
  onEvent: (e: ResearchEvent) => void,
  opts: { forceRefresh?: boolean; cakeId?: string | null; signal?: AbortSignal } = {},
): Promise<ResearchResult> {
  const res = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requirements, forceRefresh: opts.forceRefresh ?? false, cakeId: opts.cakeId ?? null }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error ?? `Research failed (${res.status})`, res.status, (data as { code?: string }).code);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ResearchResult | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const event = JSON.parse(line) as ResearchEvent;
      onEvent(event);
      if (event.type === "result") result = event.data;
      if (event.type === "error") throw new ApiError(event.message, 500, event.code);
    }
    if (done) break;
  }
  if (!result) throw new ApiError("Research ended without a result. Please try again.", 500);
  return result;
}

/** Remember the last result for this tab (recipe data only — never secrets). */
export const lastResult = {
  save(r: ResearchResult) {
    try {
      sessionStorage.setItem("crf:last", JSON.stringify(r));
    } catch {
      /* storage full or disabled — non-critical */
    }
  },
  load(): ResearchResult | null {
    try {
      const raw = sessionStorage.getItem("crf:last");
      return raw ? (JSON.parse(raw) as ResearchResult) : null;
    } catch {
      return null;
    }
  },
  clear() {
    try {
      sessionStorage.removeItem("crf:last");
    } catch {
      /* ignore */
    }
  },
};
