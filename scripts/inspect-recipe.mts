/**
 * Fetch a published recipe page (respecting robots.txt) and print its schema.org Recipe data.
 * Used when curating the library to verify reference URLs and read real ratios.
 *   npx tsx --conditions=react-server --tsconfig tsconfig.json scripts/inspect-recipe.mts <url> [--full]
 */
import { fetchHtml } from "@/lib/research/fetchPage";
import { extractRecipeFromHtml } from "@/lib/research/jsonld";

const [url, flag] = process.argv.slice(2);
if (!url) {
  console.error("usage: inspect-recipe.mts <url> [--full]");
  process.exit(1);
}
try {
  const { html } = await fetchHtml(url);
  const r = extractRecipeFromHtml(html, url);
  if (!r) {
    console.log(JSON.stringify({ url, ok: false, reason: "no schema.org Recipe data" }));
    process.exit(0);
  }
  const out = flag === "--full" ? r : { ...r, instructions: r.instructions.map((s) => s.slice(0, 160)) };
  console.log(JSON.stringify({ ok: true, ...out }, null, 1));
} catch (e) {
  console.log(JSON.stringify({ url, ok: false, reason: (e as Error).message }));
}
process.exit(0);
