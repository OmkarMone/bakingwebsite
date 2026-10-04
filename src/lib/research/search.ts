import "server-only";
import { createHash } from "node:crypto";
import type { SearchHit } from "@/lib/types";
import { env } from "@/lib/server/env";
import { getDb } from "@/lib/server/db";
import { sharedCache } from "@/lib/server/memoryCache";
import { anthropicClient } from "@/lib/ai/claude";
import { domainOf } from "./sources";
import type { SearchQuery } from "./queries";

/**
 * Web search provider abstraction. Every provider is a legitimate search API —
 * we never scrape search engine result pages.
 */
export interface SearchProvider {
  name: string;
  search(query: SearchQuery, count: number): Promise<SearchHit[]>;
}

export class SearchConfigError extends Error {}

const TIMEOUT = 12_000;
const SEARCH_TTL_MS = 24 * 60 * 60_000; // search results go stale quickly-ish: 24h

const withSiteOperators = (q: SearchQuery) =>
  q.includeDomains?.length ? `${q.q} (${q.includeDomains.map((d) => `site:${d}`).join(" OR ")})` : q.q;

async function getJson(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Search API ${new URL(url).hostname} returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

const hit = (provider: string, query: string, url: string, title?: string, snippet?: string): SearchHit => ({
  url,
  title: (title ?? "").slice(0, 300),
  snippet: (snippet ?? "").replace(/<[^>]+>/g, "").slice(0, 500),
  domain: domainOf(url),
  provider,
  query,
});

const brave: SearchProvider = {
  name: "Brave Search",
  async search(q, count) {
    const query = withSiteOperators(q);
    const data = (await getJson(
      `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: query, count: String(Math.min(count, 20)), safesearch: "strict" })}`,
      { headers: { Accept: "application/json", "X-Subscription-Token": env.braveKey()! } },
    )) as { web?: { results?: { url: string; title?: string; description?: string }[] } };
    return (data.web?.results ?? []).map((r) => hit("brave", q.q, r.url, r.title, r.description));
  },
};

const tavily: SearchProvider = {
  name: "Tavily",
  async search(q, count) {
    const data = (await getJson("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.tavilyKey()}` },
      body: JSON.stringify({
        query: q.q,
        max_results: Math.min(count, 20),
        search_depth: "basic",
        include_domains: q.includeDomains ?? [],
      }),
    })) as { results?: { url: string; title?: string; content?: string }[] };
    return (data.results ?? []).map((r) => hit("tavily", q.q, r.url, r.title, r.content));
  },
};

const serpapi: SearchProvider = {
  name: "SerpApi (Google)",
  async search(q, count) {
    const data = (await getJson(
      `https://serpapi.com/search.json?${new URLSearchParams({ engine: "google", q: withSiteOperators(q), num: String(Math.min(count, 20)), api_key: env.serpapiKey()! })}`,
      {},
    )) as { organic_results?: { link: string; title?: string; snippet?: string }[] };
    return (data.organic_results ?? []).map((r) => hit("serpapi", q.q, r.link, r.title, r.snippet));
  },
};

const googleCse: SearchProvider = {
  name: "Google Programmable Search",
  async search(q, count) {
    const data = (await getJson(
      `https://www.googleapis.com/customsearch/v1?${new URLSearchParams({ key: env.googleCseKey()!, cx: env.googleCseId()!, q: withSiteOperators(q), num: String(Math.min(count, 10)) })}`,
      {},
    )) as { items?: { link: string; title?: string; snippet?: string }[] };
    return (data.items ?? []).map((r) => hit("google", q.q, r.link, r.title, r.snippet));
  },
};

/**
 * Claude's server-side web search tool. URLs are taken ONLY from the tool's
 * `web_search_result` blocks (real search results) — never from model-written text.
 */
const anthropicSearch: SearchProvider = {
  name: "Claude web search",
  async search(q, count) {
    const client = anthropicClient();
    const tool = {
      type: "web_search_20260209" as const,
      name: "web_search" as const,
      max_uses: 1,
      ...(q.includeDomains?.length ? { allowed_domains: q.includeDomains.slice(0, 20) } : {}),
    };
    const messages: { role: "user" | "assistant"; content: unknown }[] = [
      {
        role: "user",
        content: `Run exactly one web search for: "${q.q}". Do not answer anything else; reply "done" after searching.`,
      },
    ];
    const hits: SearchHit[] = [];
    for (let turn = 0; turn < 3; turn++) {
      const res = await client.messages.create({
        model: env.anthropicModel(),
        max_tokens: 2048,
        output_config: { effort: "low" },
        tools: [tool],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
      });
      for (const block of res.content) {
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content) {
            if (r.type === "web_search_result") hits.push(hit("anthropic", q.q, r.url, r.title, r.page_age ?? ""));
          }
        }
      }
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content });
    }
    return hits.slice(0, count);
  },
};

export function selectProvider(): SearchProvider {
  const wanted = env.searchProvider();
  const available: Record<string, SearchProvider | null> = {
    brave: env.braveKey() ? brave : null,
    tavily: env.tavilyKey() ? tavily : null,
    serpapi: env.serpapiKey() ? serpapi : null,
    google: env.googleCseKey() && env.googleCseId() ? googleCse : null,
    anthropic: env.anthropicKey() ? anthropicSearch : null,
  };
  if (wanted) {
    const p = available[wanted];
    if (!p) throw new SearchConfigError(`SEARCH_PROVIDER="${wanted}" is set but its API key is missing.`);
    return p;
  }
  const first = Object.values(available).find(Boolean);
  if (!first)
    throw new SearchConfigError(
      "No web search provider is configured. Add BRAVE_SEARCH_API_KEY, TAVILY_API_KEY, SERPAPI_API_KEY, GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID, or ANTHROPIC_API_KEY.",
    );
  return first;
}

const memSearch = sharedCache<SearchHit[]>("search", 300);

/** Cached search: memory → DB → provider. */
export async function cachedSearch(provider: SearchProvider, q: SearchQuery, count: number): Promise<SearchHit[]> {
  const key = createHash("sha256")
    .update(JSON.stringify([provider.name, q.q, q.includeDomains ?? [], count]))
    .digest("hex");
  const mem = memSearch.get(key);
  if (mem) return mem;

  const db = getDb();
  if (db) {
    const row = await db.searchCache.findUnique({ where: { key } }).catch(() => null);
    if (row && row.expiresAt > new Date()) {
      const results = row.results as unknown as SearchHit[];
      memSearch.set(key, results, SEARCH_TTL_MS);
      return results;
    }
  }

  const results = await provider.search(q, count);
  memSearch.set(key, results, SEARCH_TTL_MS);
  if (db) {
    const expiresAt = new Date(Date.now() + SEARCH_TTL_MS);
    await db.searchCache
      .upsert({
        where: { key },
        create: { key, provider: provider.name, query: q.q, results: results as object[], expiresAt, source: env.dataSource() },
        update: { results: results as object[], expiresAt, createdAt: new Date() },
      })
      .catch((e) => console.warn("[search] cache write failed", e));
  }
  return results;
}
