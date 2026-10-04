import "server-only";
import { createHash } from "node:crypto";
import type { CakeRequirements, ExtractedRecipe, ResearchConfidence, ResearchEvent, ResearchResult, ScoredRecipe, SearchHit } from "@/lib/types";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { sharedCache } from "@/lib/server/memoryCache";
import { CAKES, FROSTINGS, cakeById } from "@/lib/library";
import { isStrongMatch, matchCakes, type CakeMatch } from "@/lib/library/matcher";
import { assembleRecipe } from "@/lib/library/assemble";
import { generateSearchQueries } from "./queries";
import { cachedSearch, searchConfigured, selectProvider } from "./search";
import { extractRecipe } from "./extract";
import { isBlockedDomain, tierOf, domainOf } from "./sources";
import { canonicalUrl, recipeFingerprint, scoreRecipe, selectCandidates, validateExtracted } from "./recipeRanking";
import { computeConfidence, requirementsMatched, validateFinalRecipe } from "./recipeValidator";

/**
 * Recipe finder pipeline — no AI anywhere:
 *
 *   1. Match the requirements against the curated library (deterministic scoring).
 *   2. Strong match → scale/adapt the curated recipe to the request and validate it.
 *   3. No strong match + web search configured → search the web, read schema.org recipe data,
 *      rank published recipes and show the best ones (linking to the originals).
 *   4. Otherwise → the closest library recipe that meets the dietary requirements, clearly labelled.
 */

export class ResearchError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

const WEB_TTL_MS = 14 * 24 * 60 * 60_000;
const LIBRARY_TTL_MS = 60 * 24 * 60 * 60_000; // deterministic; kept long so saved/shared ids resolve
const MAX_CANDIDATES = 14;
const MAX_PER_DOMAIN = 2;
const memResults = sharedCache<ResearchResult>("research", 200);

/** Changes whenever library content or the matching/assembly logic changes, so cached results never go stale. */
const PIPELINE_VERSION = 4;
const LIBRARY_HASH = createHash("sha256").update(JSON.stringify([PIPELINE_VERSION, CAKES, FROSTINGS])).digest("hex").slice(0, 12);

export function researchKey(r: CakeRequirements, cakeId?: string | null): string {
  const { location, query, ...rest } = r;
  const material = {
    ...rest,
    equipment: [...rest.equipment].map((s) => s.toLowerCase()).sort(),
    availableIngredients: [...rest.availableIngredients].map((s) => s.toLowerCase()).sort(),
    cakeType: rest.cakeType.toLowerCase(),
    query: query.toLowerCase().replace(/\s+/g, " ").trim(),
    country: location?.countryCode ?? null,
    cakeId: cakeId ?? null,
    library: LIBRARY_HASH,
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
  if (!result.kind) return null; // legacy (pre-library) cache entry
  memResults.set(key, result, row.expiresAt.getTime() - Date.now());
  return result;
}

async function storeResearch(result: ResearchResult, ttl: number) {
  memResults.set(result.id, result, ttl);
  const db = getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + ttl);
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

/* ────────────────────────────── Library ────────────────────────────── */

function libraryResult(key: string, req: CakeRequirements, match: CakeMatch, matches: CakeMatch[], closestOnly: boolean): ResearchResult {
  const { recipe, frosting, scaleFactor } = assembleRecipe(match.cake, req);
  if (closestOnly) {
    recipe.warnings.unshift(
      `We don't have a curated “${req.flavor && !req.cakeType.toLowerCase().includes(req.flavor.toLowerCase()) ? `${req.flavor} ${req.cakeType}` : req.cakeType}” recipe yet, so this is the closest match in our library${
        match.reasons.length ? ` (${match.reasons[0].toLowerCase()})` : ""
      }. Adjust flavourings to taste, or check the alternatives below.`,
    );
  }
  const validation = validateFinalRecipe(recipe, req);
  const references = [...match.cake.references, ...(frosting?.references ?? [])];
  // A closest match doesn't satisfy the requested cake type, so it can't claim a high match
  const matchedPct = closestOnly ? Math.min(requirementsMatched(recipe, req, validation), Math.round(40 + match.typeMatch * 40)) : requirementsMatched(recipe, req, validation);
  const errors = validation.filter((v) => v.level === "error").length;
  const domains = new Set(references.map((r) => domainOf(r.url))).size;
  const level: ResearchConfidence["level"] =
    !closestOnly && errors === 0 && match.cake.references.length >= 2 && matchedPct >= 85 ? "High" : !closestOnly || match.typeMatch >= 0.5 ? "Medium" : "Low";

  return {
    id: key,
    kind: "library",
    requirements: req,
    recipe,
    library: {
      cakeId: match.cake.id,
      frostingId: frosting?.id ?? null,
      matchScore: match.score,
      reasons: match.reasons,
      closestOnly,
      scaleFactor,
      alternatives: matches
        .filter((m) => m.dietOk && m.cake.id !== match.cake.id)
        .slice(0, 4)
        .map((m) => ({ cakeId: m.cake.id, name: m.cake.name, score: m.score })),
    },
    references,
    sources: [],
    rejected: [],
    confidence: {
      level,
      recipesFound: CAKES.length,
      recipesCompared: references.length,
      sourcesAnalyzed: domains,
      requirementsMatchedPct: matchedPct,
      explanation: closestOnly
        ? "No exact match in our curated library — showing the closest recipe that meets your dietary needs."
        : `Curated recipe, cross-checked against ${references.length} published recipes from ${domains} site${domains === 1 ? "" : "s"} and scaled to your requirements.`,
    },
    validation,
    searchProvider: null,
    queries: [],
    researchedAt: new Date().toISOString(),
    cached: false,
  };
}

/* ────────────────────────────── Web fallback ────────────────────────────── */

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
    if (/\/(category|tag|collections?|search|page\/\d+)\//i.test(h.url) || /\b(\d+|best)\s+.*recipes\b/i.test(h.title)) {
      rejected.push({ url: h.url, domain: h.domain, reason: "Roundup or category page, not a single recipe" });
      continue;
    }
    unique.push(h);
  }
  const rank = (h: SearchHit) => ({ trusted: 0, established: 1, unknown: 2 })[tierOf(h.domain)];
  const ordered = unique.map((h, i) => ({ h, i })).sort((a, b) => rank(a.h) - rank(b.h) || a.i - b.i).map((x) => x.h);
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

async function webResearch(key: string, req: CakeRequirements, matches: CakeMatch[], emit: (e: ResearchEvent) => void): Promise<ResearchResult | null> {
  emit({ type: "progress", step: "search", status: "active" });
  const provider = selectProvider();
  const queries = generateSearchQueries(req);
  const settled = await Promise.allSettled(queries.map((q) => cachedSearch(provider, q, 10)));
  const hits = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  if (settled.every((s) => s.status === "rejected")) {
    console.error("[research] all searches failed", settled.map((f) => (f as PromiseRejectedResult).reason));
    emit({ type: "progress", step: "search", status: "skipped", detail: "Web search unavailable" });
    return null;
  }
  const { candidates, rejected } = collectCandidates(hits);
  emit({ type: "progress", step: "search", status: "done", detail: `${candidates.length} candidate pages from ${new Set(candidates.map((c) => c.domain)).size} sites (${provider.name})` });
  if (!candidates.length) return null;

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
  emit({ type: "progress", step: "extract", status: "done", detail: `${extracted.length} usable recipes · ${rejected.length} pages skipped` });
  if (!extracted.length) return null;

  emit({ type: "progress", step: "compare", status: "active" });
  const scored = extracted.map((r) => scoreRecipe(r, req)).sort((a, b) => b.score - a.score);
  const selected = selectCandidates(scored);
  const matching = selected.filter((s) => s.role !== "technique_reference");
  if (!matching.length) {
    emit({ type: "progress", step: "compare", status: "done", detail: "None met your dietary requirements" });
    return null;
  }
  const primaryUrl = matching[0].url;
  const sources: ScoredRecipe[] = scored.map((s) => ({
    ...s,
    role: s.url === primaryUrl ? "primary" : matching.some((m) => m.url === s.url) ? "supporting" : s.role === "technique_reference" ? "technique_reference" : "not_used",
  }));
  emit({ type: "progress", step: "compare", status: "done", detail: `Ranked ${scored.length} recipes · top score ${matching[0].score}/100` });

  const confidence = computeConfidence(extracted.length, selected, matching[0].relevancePct, []);
  return {
    id: key,
    kind: "web",
    requirements: req,
    recipe: null,
    library: matches[0]?.dietOk
      ? {
          cakeId: matches[0].cake.id,
          frostingId: null,
          matchScore: matches[0].score,
          reasons: matches[0].reasons,
          closestOnly: true,
          scaleFactor: 1,
          alternatives: matches.filter((m) => m.dietOk).slice(0, 4).map((m) => ({ cakeId: m.cake.id, name: m.cake.name, score: m.score })),
        }
      : null,
    references: [],
    sources,
    rejected: rejected.slice(0, 40),
    confidence: { ...confidence, explanation: `No curated recipe matched, so we ranked published recipes from the web. ${confidence.explanation}` },
    validation: [],
    searchProvider: provider.name,
    queries: queries.map((q) => (q.includeDomains?.length ? `${q.q} [${q.purpose}]` : q.q)),
    researchedAt: new Date().toISOString(),
    cached: false,
  };
}

/* ────────────────────────────── Orchestrator ────────────────────────────── */

export async function runResearch(
  req: CakeRequirements,
  emit: (e: ResearchEvent) => void,
  opts: { forceRefresh?: boolean; cakeId?: string | null } = {},
): Promise<ResearchResult> {
  const key = researchKey(req, opts.cakeId);
  emit({ type: "progress", step: "requirements", status: "done" });

  if (!opts.forceRefresh) {
    const cached = await getCachedResearch(key);
    if (cached) {
      for (const step of ["library", "search", "extract", "compare", "validate"] as const) emit({ type: "progress", step, status: "done", detail: "From cache" });
      return { ...cached, cached: true, requirements: { ...cached.requirements, location: req.location } };
    }
  }

  emit({ type: "progress", step: "library", status: "active" });
  const matches = matchCakes(req);
  const forced = opts.cakeId ? cakeById(opts.cakeId) : undefined;
  if (opts.cakeId && !forced) throw new ResearchError("That recipe is no longer in our library.", "unknown_recipe");
  const chosen = forced ? matches.find((m) => m.cake.id === forced.id)! : matches[0];

  const skipWeb = () => {
    for (const step of ["search", "extract", "compare"] as const) emit({ type: "progress", step, status: "skipped" });
  };

  if (forced || isStrongMatch(chosen)) {
    emit({ type: "progress", step: "library", status: "done", detail: `Matched “${chosen.cake.name}” from our curated library` });
    skipWeb();
    emit({ type: "progress", step: "validate", status: "active" });
    const result = libraryResult(key, req, chosen, matches, false);
    emit({ type: "progress", step: "validate", status: "done", detail: "Quantities, temperatures and dietary rules checked" });
    await storeResearch(result, LIBRARY_TTL_MS);
    return result;
  }

  emit({ type: "progress", step: "library", status: "done", detail: "No exact match in our curated library" });

  if (searchConfigured()) {
    const web = await webResearch(key, req, matches, emit);
    if (web) {
      emit({ type: "progress", step: "validate", status: "done" });
      await storeResearch(web, WEB_TTL_MS);
      return web;
    }
  } else skipWeb();

  // Nothing resembles the request → a neutral vanilla base is the most adaptable starting point
  const dietOk = matches.filter((m) => m.dietOk);
  const closest =
    dietOk[0] && dietOk[0].typeMatch === 0
      ? dietOk.find((m) => m.cake.tags.includes("vanilla") && !m.cake.tags.includes("chocolate")) ?? dietOk[0]
      : dietOk[0];
  if (!closest) {
    throw new ResearchError(
      "We don't have a recipe that meets all of your dietary requirements yet. Try relaxing one requirement, or check back as we add recipes.",
      "no_matching",
    );
  }
  emit({ type: "progress", step: "validate", status: "active" });
  const result = libraryResult(key, req, closest, matches, true);
  emit({ type: "progress", step: "validate", status: "done" });
  await storeResearch(result, LIBRARY_TTL_MS);
  return result;
}
