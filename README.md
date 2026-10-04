# CakeRecipe Finder

Tell it the cake you want to bake. It searches reputable baking sites, reads their published recipe data, scores and compares the recipes, and has Claude build one recipe for your exact requirements. Every source is linked.

## How the research works

```
Requirements → search queries → web search API → collect + dedupe (canonical URL, blocked domains, per-domain cap)
→ robots.txt check → fetch (SSRF-guarded) → schema.org/Recipe JSON-LD extraction → validate → content-fingerprint dedupe
→ score (0–100) → select → Claude synthesis (structured output) → deterministic validation (+1 corrective retry)
→ confidence → cache → stream result
```

- **Extraction** reads only the JSON-LD `Recipe` markup that publishers expose for search engines. That gives real ratings, review counts, authors, yields, times, oven temperature and pan size.
- **Scoring** (`src/lib/research/recipeRanking.ts`) is out of 100 points:
  - Reliability: 20
  - Bayesian-adjusted rating: 12
  - Review volume: 10
  - Detail: 10
  - Ingredient quality: 8
  - Technique: 10
  - Relevance to your requirements: 25
  - Evidence: 5

  Recipes that break a dietary requirement are used **only as technique references**.
- **Synthesis** (`recipeGenerator.ts`) runs Claude with a fixed server-side prompt. Third-party content is wrapped in `<untrusted_source>` tags with the angle brackets neutralised. Any URL Claude cites that wasn't researched is discarded.
- **Validation** (`recipeValidator.ts`) checks:
  - units and plausible quantities
  - temperature and time
  - pan size and yield
  - dietary violations
  - baking soda without an acid
  - leavener ratios
- If no reliable recipes are found, the app says so. It never invents a recipe, source, rating, price or stock level.

## Features

- Free-text request turned into editable requirements, using Claude or an offline parser
- Streaming progress screen
- Research confidence indicator and a comparison table of all sources
- Ingredients in grams, ml and spoon measures, with an "I don't have this ingredient" substitution panel (curated knowledge base, with an AI fallback)
- Recipe scaling by weight or pan, cake calculator, frosting calculator and troubleshooting guide
- Where to buy:
  - nearby stores from OpenStreetMap, or Google Places if a key is set
  - a "fewest stores" plan
  - availability and prices are always labelled unverified
- Save, favourite, share link, download (Markdown), print, history and preferences. These use an anonymous signed cookie that's created only on your first save.

## Setup

```bash
npm install                    # also runs prisma generate
cp .env.example .env           # fill in keys
npm run db:dev                 # local Postgres via `prisma dev` (or use your own DATABASE_URL)
npm run db:migrate
npm run dev                    # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** for research | Recipe synthesis, AI parsing, AI substitutions. Also the fallback search provider |
| `BRAVE_SEARCH_API_KEY` / `TAVILY_API_KEY` / `SERPAPI_API_KEY` / `GOOGLE_CSE_API_KEY`+`GOOGLE_CSE_ID` | Recommended | Web search. If none is set, Claude's web-search tool is used |
| `SEARCH_PROVIDER` | No | Force `brave` \| `tavily` \| `serpapi` \| `google` \| `anthropic` |
| `ANTHROPIC_MODEL` | No | Default `claude-opus-5-5` |
| `GOOGLE_MAPS_API_KEY` | No | Google Places for stores. Without it, OpenStreetMap is used (no key needed) |
| `OSM_CONTACT_EMAIL` | No | Sent in the User-Agent, as OSM's usage policy requests |
| `DATABASE_URL` | Recommended | PostgreSQL. Without it, research still works but saving is disabled |
| `DATABASE_POOL_MAX` | No | Use `1` with `prisma dev` |
| `SESSION_SECRET` | Yes in production | Signs the profile cookie |
| `ALLOWED_ORIGINS` | No | Comma-separated origins allowed to call the API. No wildcard |
| `DATA_SOURCE` | No | `local` / `production`, written to the `source` column of every insert |

### Scripts

`npm test` (Vitest) · `npm run typecheck` · `npm run lint` · `npm run build`

## Security

- All keys are server-only, and every AI call goes through API routes.
- POST routes reject requests from other origins, and the app never sends CORS headers.
- Inputs are validated with Zod.
- Expensive routes have per-IP sliding-window rate limits. Requests answered from the cache are not counted.
- Outbound fetches respect robots.txt and are restricted to public IPs over http(s), with redirect checks, size limits and timeouts.
- Precise location is used only for the store lookup and is never stored. Share links strip the location.

## Known limitations

- Store availability is inferred from the store type, and prices aren't shown, because no retailer inventory or price API is connected.
- Sites that don't publish JSON-LD, or that block bots, can't be used. They appear under "Pages we skipped".
- Rate limits and in-memory caches are per process. Use Redis for multi-instance deployments.
- There are no real user accounts: profiles are anonymous and tied to a cookie.
