import "server-only";
import type { ExtractedRecipe } from "@/lib/types";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { sharedCache } from "@/lib/server/memoryCache";
import { fetchHtml, FetchBlockedError } from "./fetchPage";
import { extractRecipeFromHtml } from "./jsonld";
import { domainOf } from "./sources";

export type ExtractOutcome =
  | { ok: true; recipe: ExtractedRecipe; cached: boolean }
  | { ok: false; reason: string; status: "no_recipe" | "blocked_robots" | "http_error" | "error"; cached: boolean };

const OK_TTL = 7 * 24 * 60 * 60_000; // recipe pages change rarely; ratings refresh weekly
const FAIL_TTL = 24 * 60 * 60_000;
const mem = sharedCache<ExtractOutcome>("extract", 800);

/** Fetch + extract with per-URL caching (memory → DB → network). */
export async function extractRecipe(url: string): Promise<ExtractOutcome> {
  const hot = mem.get(url);
  if (hot) return { ...hot, cached: true };

  const db = getDb();
  if (db) {
    const row = await db.sourceCache.findUnique({ where: { url } }).catch(() => null);
    if (row && row.expiresAt > new Date()) {
      const outcome: ExtractOutcome =
        row.status === "ok" && row.data
          ? { ok: true, recipe: row.data as unknown as ExtractedRecipe, cached: true }
          : { ok: false, status: row.status as "no_recipe", reason: describe(row.status), cached: true };
      mem.set(url, outcome, outcome.ok ? OK_TTL : FAIL_TTL);
      return outcome;
    }
  }

  let outcome: ExtractOutcome;
  try {
    const { html } = await fetchHtml(url);
    const recipe = extractRecipeFromHtml(html, url);
    outcome = recipe
      ? { ok: true, recipe, cached: false }
      : { ok: false, status: "no_recipe", reason: describe("no_recipe"), cached: false };
  } catch (e) {
    if (e instanceof FetchBlockedError) {
      const status = e.reason === "robots" ? "blocked_robots" : e.reason === "http" ? "http_error" : "error";
      outcome = { ok: false, status, reason: e.reason === "robots" ? describe("blocked_robots") : e.message, cached: false };
    } else {
      console.warn("[extract] unexpected", url, e);
      outcome = { ok: false, status: "error", reason: "Could not read page", cached: false };
    }
  }

  // Transient network errors aren't cached long
  const ttl = outcome.ok ? OK_TTL : outcome.status === "error" ? 30 * 60_000 : FAIL_TTL;
  mem.set(url, outcome, ttl);
  if (db) {
    const expiresAt = new Date(Date.now() + ttl);
    const status = outcome.ok ? "ok" : outcome.status;
    const data = outcome.ok ? (outcome.recipe as unknown as object) : undefined;
    await db.sourceCache
      .upsert({
        where: { url },
        create: { url, domain: domainOf(url), status, data, expiresAt, source: env.dataSource() },
        update: { status, data, expiresAt, fetchedAt: new Date() },
      })
      .catch((e) => console.warn("[extract] cache write failed", e));
  }
  return outcome;
}

function describe(status: string) {
  switch (status) {
    case "no_recipe":
      return "No structured recipe data on page";
    case "blocked_robots":
      return "Site's robots.txt does not allow automated access — respected";
    case "http_error":
      return "Page unavailable";
    default:
      return "Could not read page";
  }
}
