# CakeRecipe Finder

Tell it the cake you want to bake and get a reliable recipe for your exact requirements. **No AI is used anywhere.**

- Recipes come from a **curated library**. Each one is written in our own words, with ratios cross-checked against well-rated published recipes, and every reference was fetched and verified.
- If nothing in the library fits, the app can **search the web** (optional) and rank published recipes, linking to the originals.

## How it works

```
Requirements (deterministic text parser + editable form)
  → match against the curated library (cake type/flavour 60 · texture 15 · appliance 15 · frosting 10; diet = hard filter)
  → strong match?  → scale to requested weight, choose pan size/count, adjust bake time,
                     size the frosting, apply sweetness preference → validate → show
  → no match + search key set → web search → robots.txt-respecting fetch → schema.org Recipe extraction
                     → dedupe → score (0–100) → show top-ranked recipes, linking to their methods
  → otherwise      → closest library recipe that meets the dietary needs, clearly labelled
```

| Part | Where |
|---|---|
| Library format | `src/lib/library/types.ts` |
| Cakes | `src/lib/library/cakes/*.ts` |
| Frostings | `src/lib/library/frostings.ts` |
| Matching | `src/lib/library/matcher.ts` |
| Scaling / pan / frosting assembly | `src/lib/library/assemble.ts` |
| Quality gate for every library entry | `src/lib/library/__tests__/library.test.ts`: diet flags vs ingredients, plausible quantities, baked weight vs ingredient mass, oven range, leavening balance, ≥2 verified references |
| Web fallback | `src/lib/research/*`: search providers, safe fetching, JSON-LD extraction, transparent ranking |

### Adding a recipe to the library

1. Find 2–4 well-rated published versions, then verify each one and read its real ratios:
   ```bash
   npx tsx --conditions=react-server --tsconfig tsconfig.json scripts/inspect-recipe.mts <url>
   ```
2. Design the formula and write the method in your own words. Never copy method text.
3. Add the entry to the right file in `src/lib/library/cakes/`.
4. Run `npm test`. The library quality gate must pass.

## Features

- Free-text request turned into editable requirements
- Curated recipe scaled to your size, with pan choice, bake-time adjustment and frosting quantities
- Match confidence, plus "other recipes from our library that fit"
- Ingredients in grams, ml and spoon measures, with an "I don't have this ingredient" panel (curated baking-chemistry substitution guide)
- Cake calculator, frosting calculator, pan and recipe scaler, troubleshooting guide
- Where to buy:
  - nearby stores from OpenStreetMap (no key), or Google Places if a key is set
  - a "fewest stores" plan
  - availability and prices are always labelled unverified
- Save, favourite, share link, download (Markdown), print, history and preferences. These use an anonymous signed cookie that's created only on your first save.

## Setup

```bash
npm install                    # also runs prisma generate
cp .env.example .env
npm run db:dev                 # local Postgres via `prisma dev` (or use your own DATABASE_URL)
npm run db:migrate
npm run dev                    # http://localhost:3000
```

**No API keys are required.** Optional variables:

| Variable | Purpose |
|---|---|
| `BRAVE_SEARCH_API_KEY` / `TAVILY_API_KEY` / `SERPAPI_API_KEY` / `GOOGLE_CSE_API_KEY`+`GOOGLE_CSE_ID` | Enables the web-search fallback |
| `SEARCH_PROVIDER` | Force `brave` \| `tavily` \| `serpapi` \| `google` |
| `GOOGLE_MAPS_API_KEY` | Google Places for stores (default: OpenStreetMap) |
| `OSM_CONTACT_EMAIL` | Sent in the User-Agent, as OSM's usage policy requests |
| `DATABASE_URL`, `DATABASE_POOL_MAX` | PostgreSQL. Without it, saving is disabled. Use `1` with `prisma dev` |
| `SESSION_SECRET` | Required in production. Signs the profile cookie |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API. No wildcard |
| `DATA_SOURCE` | `local` / `production`, written to the `source` column of every insert |

Scripts: `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`

## Security

- Keys are server-only.
- POST routes reject requests from other origins, and the app never sends CORS headers.
- Inputs are validated with Zod.
- Per-IP rate limits apply.
- Outbound fetches respect robots.txt and are restricted to public IPs over http(s), with redirect checks, size limits and timeouts.
- Precise location is used only for the store lookup and is never stored. Share links strip the location.

## Known limitations

- Coverage is limited to the curated library. Unusual requests get the closest recipe, or the web fallback if a search key is set.
- Web-fallback results show ingredients and link to the method; they aren't scaled.
- Store availability is inferred from the type of store, and prices aren't shown, because no retailer inventory or price API is connected.
- Rate limits and in-memory caches are per process. Use Redis for multi-instance deployments.
