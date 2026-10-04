import "server-only";
import { createHash } from "node:crypto";
import type { CakeRequirements, ExtractedRecipe, ResearchEvent, ResearchResult, ScoredRecipe, SearchHit } from "@/lib/types";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { sharedCache } from "@/lib/server/memoryCache";
import { generateSearchQueries } from "./queries";
import { cachedSearch, selectProvider } from "./search";
import { extractRecipe } from "./extract";
import { isBlockedDomain, tierOf } from "./sources";
import { canonicalUrl, recipeFingerprint, scoreRecipe, selectCandidates, validateExtracted } from "./recipeRanking";
import { generateRecipe } from "./recipeGenerator";
import { computeConfidence, requirementsMatched, validateFinalRecipe } from "./recipeValidator";

/**
 * Research pipeline:
 *   normalise → queries → search → collect → dedupe → extract → validate → score →
 *   select → compare & synthesise → validate final → return recipe + sources
 */

export class ResearchError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

const RESULT_TTL_MS = 14 * 24 * 60 * 60_000; // re-research after two weeks
const MAX_CANDIDATES = 14;
const MAX_PER_DOMAIN = 2;
const memResults = sharedCache<ResearchResult>("research", 100);

export function researchKey(r: CakeRequirements): string {
  const { location, query, ...rest } = r;
  const material = {
    ...rest,
    equipment: [...rest.equipment].map((s) => s.toLowerCase()).sort(),
    availableIngredients: [...rest.availableIngredients].map((s) => s.toLowerCase()).sort(),
    cakeType: rest.cakeType.toLowerCase(),
    query: query.toLowerCase().replace(/\s+/g, " ").trim(),
    country: location?.countryCode ?? null,
  };
  return createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 32);
}

export async function getCachedResearch(key: string): Promise<ResearchResult | null> {
  const hot = memResults.get(key);
  if (hot) return hot;
  const db = getDb();
  if (!db) return null;
  const row = await db.researchCache.findUnique({ where: { key } }).catch(() => null);
  if (!row || row.expiresAt < new Date()) return null;
  const result = row.result as unknown as ResearchResult;
  memResults.set(key, result, row.expiresAt.getTime() - Date.now());
  return result;
}

async function storeResearch(result: ResearchResult) {
  memResults.set(result.id, result, RESULT_TTL_MS);
  const db = getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + RESULT_TTL_MS);
  const json = JSON.parse(JSON.stringify(result));
  await db.researchCache
    .upsert({
      where: { key: result.id },
      create: { key: result.id, requirements: json.requirements, result: json, expiresAt, source: env.dataSource() },
      update: { requirements: json.requirements, result: json, expiresAt, createdAt: new Date() },
    })
    .catch((e) => console.warn("[research] cache write failed", e));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/** Order candidates: interleave queries, prefer known-reputable domains, cap per domain. */
function collectCandidates(hits: SearchHit[]): { candidates: SearchHit[]; rejected: ResearchResult["rejected"] } {
  const rejected: ResearchResult["rejected"] = [];
  const seen = new Set<string>();
  const perDomain = new Map<string, number>();
  const unique: SearchHit[] = [];
  for (const h of hits) {
    if (!h.domain || !/^https?:\/\//.test(h.url)) continue;
    const key = canonicalUrl(h.url);
    if (seen.has(key)) continue;
    seen.add(key);
    if (isBlockedDomain(h.domain)) {
      rejected.push({ url: h.url, domain: h.domain, reason: "Social/video/aggregator site — not a primary recipe source" });
      continue;
    }
    // Skip obvious roundup/listicle/category pages
    if (/\/(category|tag|collections?|search|page\/\d+)\//i.test(h.url) || /\b(\d+|best)\s+.*recipes\b/i.test(h.title)) {
      rejected.push({ url: h.url, domain: h.domain, reason: "Roundup or category page, not a single recipe" });
      continue;
    }
    unique.push(h);
  }
  const rank = (h: SearchHit) => ({ trusted: 0, established: 1, unknown: 2 })[tierOf(h.domain)];
  const ordered = unique
    .map((h, i) => ({ h, i }))
    .sort((a, b) => rank(a.h) - rank(b.h) || a.i - b.i)
    .map((x) => x.h);
  const candidates: SearchHit[] = [];
  for (const h of ordered) {
    const n = perDomain.get(h.domain) ?? 0;
    if (n >= MAX_PER_DOMAIN) continue;
    perDomain.set(h.domain, n + 1);
    candidates.push(h);
    if (candidates.length >= MAX_CANDIDATES) break;
  }
  return { candidates, rejected };
}

export async function runResearch(
  req: CakeRequirements,
  emit: (e: ResearchEvent) => void,
  opts: { forceRefresh?: boolean } = {},
): Promise<ResearchResult> {
  const key = researchKey(req);
  emit({ type: "progress", step: "requirements", status: "active" });

  if (!opts.forceRefresh) {
    const cached = await getCachedResearch(key);
    if (cached) {
      emit({ type: "progress", step: "requirements", status: "done", detail: "Found a recent research result for this exact request" });
      for (const step of ["search", "extract", "compare", "synthesize", "validate"] as const)
        emit({ type: "progress", step, status: "done", detail: "From cache" });
      return { ...cached, cached: true, requirements: { ...cached.requirements, location: req.location } };
    }
  }
  emit({ type: "progress", step: "requirements", status: "done" });

  // ── Search ────────────────────────────────────────────────
  emit({ type: "progress", step: "search", status: "active" });
  const provider = selectProvider();
  const queries = generateSearchQueries(req);
  const settled = await Promise.allSettled(queries.map((q) => cachedSearch(provider, q, 10)));
  const hits = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const failures = settled.filter((s) => s.status === "rejected");
  if (failures.length === settled.length) {
    console.error("[research] all searches failed", failures.map((f) => (f as PromiseRejectedResult).reason));
    throw new ResearchError("Web search is unavailable right now. Please try again shortly.", "search_failed");
  }
  const { candidates, rejected } = collectCandidates(hits);
  emit({
    type: "progress",
    step: "search",
    status: "done",
    detail: `${candidates.length} candidate pages from ${new Set(candidates.map((c) => c.domain)).size} sites (${provider.name})`,
  });
  if (!candidates.length) throw new ResearchError("We couldn't find recipe pages for this request. Try a more common cake name.", "no_results");

  // ── Extract ───────────────────────────────────────────────
  emit({ type: "progress", step: "extract", status: "active" });
  const outcomes = await mapLimit(candidates, 5, async (c) => ({ c, o: await extractRecipe(c.url) }));
  const extracted: ExtractedRecipe[] = [];
  const fingerprints = new Set<string>();
  for (const { c, o } of outcomes) {
    if (!o.ok) {
      rejected.push({ url: c.url, domain: c.domain, reason: o.reason });
      continue;
    }
    const invalid = validateExtracted(o.recipe, req.cakeType);
    if (invalid) {
      rejected.push({ url: c.url, domain: c.domain, reason: invalid });
      continue;
    }
    const fp = recipeFingerprint(o.recipe);
    if (fingerprints.has(fp)) {
      rejected.push({ url: c.url, domain: c.domain, reason: "Duplicate of another recipe found (likely copied content)" });
      continue;
    }
    fingerprints.add(fp);
    extracted.push(o.recipe);
  }
  emit({
    type: "progress",
    step: "extract",
    status: "done",
    detail: `${extracted.length} usable recipes extracted · ${rejected.length} pages skipped`,
  });
  if (!extracted.length)
    throw new ResearchError(
      "We found pages but none had reliable, structured recipe data we could verify. We won't make a recipe up — please try a different description.",
      "no_recipes",
    );

  // ── Score & compare ───────────────────────────────────────
  emit({ type: "progress", step: "compare", status: "active" });
  const scored: ScoredRecipe[] = extracted.map((r) => scoreRecipe(r, req)).sort((a, b) => b.score - a.score);
  const selected = selectCandidates(scored);
  const matching = selected.filter((s) => s.role !== "technique_reference");
  if (!matching.length) {
    throw new ResearchError(
      "None of the recipes we found meet your dietary requirements, so we can't build a trustworthy recipe from them. Try relaxing a requirement or rephrasing.",
      "no_matching",
    );
  }
  emit({
    type: "progress",
    step: "compare",
    status: "done",
    detail: `Compared ${selected.length} recipes · top score ${selected[0].score}/100`,
  });

  // ── Synthesise ────────────────────────────────────────────
  emit({ type: "progress", step: "synthesize", status: "active", detail: "Comparing ratios and techniques…" });
  let { recipe, model } = await generateRecipe(req, selected);
  emit({ type: "progress", step: "synthesize", status: "done" });

  // ── Validate (one corrective retry) ───────────────────────
  emit({ type: "progress", step: "validate", status: "active" });
  let issues = validateFinalRecipe(recipe, req);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length) {
    emit({ type: "progress", step: "validate", status: "active", detail: `Fixing ${errors.length} issue(s)…` });
    try {
      const retry = await generateRecipe(req, selected, { feedback: errors.map((e) => e.message) });
      const retryIssues = validateFinalRecipe(retry.recipe, req);
      if (retryIssues.filter((i) => i.level === "error").length < errors.length) {
        recipe = retry.recipe;
        model = retry.model;
        issues = retryIssues;
      }
    } catch (e) {
      console.warn("[research] corrective retry failed", e);
    }
  }
  emit({ type: "progress", step: "validate", status: "done" });

  // Mark source roles from the model's comparison (URLs already filtered to known sources)
  const roles = new Map(recipe.sourceComparison.map((c) => [c.url, c.role]));
  const sources = scored.map((s) => {
    const inSelection = selected.some((x) => x.url === s.url);
    return { ...s, role: roles.get(s.url) ?? (inSelection ? s.role ?? "supporting" : "not_used") } as ScoredRecipe;
  });

  const matchedPct = requirementsMatched(recipe, req, issues);
  const result: ResearchResult = {
    id: key,
    requirements: req,
    recipe,
    sources,
    rejected: rejected.slice(0, 40),
    confidence: computeConfidence(extracted.length, selected, matchedPct, issues),
    validation: issues,
    searchProvider: provider.name,
    queries: queries.map((q) => (q.includeDomains?.length ? `${q.q} [${q.purpose}]` : q.q)),
    model,
    researchedAt: new Date().toISOString(),
    cached: false,
  };
  await storeResearch(result);
  return result;
}
