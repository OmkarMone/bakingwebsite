import type { ExtractedRecipe } from "@/lib/types";
import { domainOf, lookupSource } from "./sources";

/**
 * Extract a schema.org/Recipe from a page's JSON-LD.
 * This is the structured data publishers deliberately expose for search engines —
 * we read only that, never scrape page layout. All strings are treated as untrusted text:
 * tags stripped, entities decoded, lengths capped.
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  deg: "°",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  times: "×",
};

export function cleanText(input: unknown, max = 1000): string {
  if (input == null) return "";
  let s = String(input);
  for (let i = 0; i < 2; i++) {
    // double-encoded entities are common (&amp;#8217;)
    s = s
      .replace(/&#(\d+);/g, (_, n) => safeChar(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeChar(parseInt(n, 16)))
      .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
  }
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function safeChar(code: number) {
  if (!Number.isFinite(code) || code < 32 || code > 0x10ffff) return " ";
  try {
    return String.fromCodePoint(code);
  } catch {
    return " ";
  }
}

const asArray = <T,>(v: T | T[] | null | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

function hasType(node: Obj, type: string): boolean {
  return asArray(node["@type"] as Json).some((t) => typeof t === "string" && t.toLowerCase() === type.toLowerCase());
}

function findRecipeNodes(node: Json, out: Obj[] = [], depth = 0): Obj[] {
  if (depth > 8 || node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => findRecipeNodes(n, out, depth + 1));
    return out;
  }
  if (hasType(node, "Recipe")) out.push(node);
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    if (node[key] && typeof node[key] === "object") findRecipeNodes(node[key], out, depth + 1);
  }
  return out;
}

function parseJsonLoose(raw: string): Json | null {
  const trimmed = raw.trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      // common breakages: raw newlines/tabs inside strings, trailing commas
      return JSON.parse(trimmed.replace(/[\n\r\t]/g, " ").replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

/** ISO-8601 duration (PT1H20M, P0DT0H45M, PT90M) → minutes */
export function isoDurationToMinutes(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => (x ? Number(x) : 0)) as number[];
  const total = Math.round(d * 1440 + h * 60 + min + s / 60);
  return total > 0 && total < 7 * 1440 ? total : null;
}

function instructionsOf(v: Json): string[] {
  const out: string[] = [];
  const walk = (n: Json, depth: number) => {
    if (depth > 6 || n == null) return;
    if (typeof n === "string") {
      // Some sites put all steps in one string separated by newlines or numbered items
      const parts = n.includes("\n") ? n.split(/\n+/) : [n];
      parts.map((p) => cleanText(p, 1200)).filter((p) => p.length > 2).forEach((p) => out.push(p));
      return;
    }
    if (Array.isArray(n)) return n.forEach((x) => walk(x, depth + 1));
    if (typeof n === "object") {
      if (hasType(n, "HowToSection") || n.itemListElement) {
        const name = cleanText(n.name, 120);
        if (name) out.push(`— ${name} —`);
        walk(n.itemListElement as Json, depth + 1);
        return;
      }
      const t = cleanText(n.text ?? n.name ?? n.description, 1200);
      if (t) out.push(t);
    }
  };
  walk(v, 0);
  return out.slice(0, 60);
}

function authorOf(v: Json): string | null {
  const names = asArray(v)
    .map((a) => (typeof a === "string" ? a : a && typeof a === "object" && !Array.isArray(a) ? (a.name as string) : null))
    .filter((x): x is string => typeof x === "string")
    .map((x) => cleanText(x, 80))
    .filter(Boolean);
  return names.length ? names.slice(0, 3).join(", ") : null;
}

function imageOf(v: Json): string | null {
  for (const i of asArray(v)) {
    const url = typeof i === "string" ? i : i && typeof i === "object" && !Array.isArray(i) ? (i.url as string) : null;
    if (typeof url === "string" && /^https:\/\//.test(url)) return url.slice(0, 500);
  }
  return null;
}

function numberOf(v: Json | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function yieldOf(v: Json): string | null {
  const parts = asArray(v)
    .map((x) => cleanText(x, 60))
    .filter(Boolean);
  // ["12", "12 slices"] → prefer the descriptive one
  const best = parts.sort((a, b) => b.length - a.length)[0];
  return best || null;
}

/** First plausible oven temperature, normalised to °C. */
export function findOvenTempC(texts: string[]): number | null {
  const joined = texts.join(" \n ");
  const re = /(\d{2,3})\s*(?:°|º|˚|degrees?|deg\.?)\s*(c|f|celsius|fahrenheit)\b|(\d{3})\s*(c|f)\b/gi;
  for (const m of joined.matchAll(re)) {
    const value = Number(m[1] ?? m[3]);
    const unit = (m[2] ?? m[4]).toLowerCase()[0];
    const c = unit === "f" ? Math.round(((value - 32) * 5) / 9) : value;
    if (c >= 120 && c <= 240) return c;
  }
  return null;
}

/** Pan size mention, e.g. `8-inch round`, `9x13`, `20 cm`. */
export function findPanSize(texts: string[]): string | null {
  const joined = texts.join(" \n ");
  const rect = joined.match(/\b(\d{1,2})\s?(?:x|×|by)\s?(\d{1,2})(?:\s?(?:-|\s)?(?:inch|in\b|"|”|cm))?/i);
  const inch = joined.match(
    /\b(\d{1,2}(?:\.\d)?)\s?(?:-|\s)?(?:inch(?:es)?|in\.|"|”)\s?(round|square|springform|bundt|loaf|cake|baking)?\s?(?:pans?|tins?|moulds?|molds?)?/i,
  );
  const cm = joined.match(/\b(\d{2}(?:\.\d)?)\s?cm\s?(round|square|springform|loaf|cake)?\s?(?:pans?|tins?)?/i);
  if (rect && Number(rect[1]) >= 4 && Number(rect[2]) >= 4) return `${rect[1]}×${rect[2]} inch`;
  if (inch && Number(inch[1]) >= 4 && Number(inch[1]) <= 14) return `${inch[1]}-inch${inch[2] ? ` ${inch[2].toLowerCase()}` : ""}`;
  if (cm && Number(cm[1]) >= 12 && Number(cm[1]) <= 35) return `${cm[1]} cm${cm[2] ? ` ${cm[2].toLowerCase()}` : ""}`;
  return null;
}

function siteNameFromHtml(html: string): string | null {
  const m = html.match(/<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']{2,80})["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']{2,80})["'][^>]*property=["']og:site_name["']/i);
  return m ? cleanText(m[1], 80) : null;
}

export function extractRecipeFromHtml(html: string, url: string): ExtractedRecipe | null {
  const blocks = [...html.matchAll(/<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)];
  const candidates: Obj[] = [];
  for (const b of blocks) {
    const parsed = parseJsonLoose(b[1]);
    if (parsed) findRecipeNodes(parsed, candidates);
  }
  if (!candidates.length) return null;

  // Pick the most complete Recipe node on the page
  const node = candidates
    .map((n) => ({ n, size: asArray(n.recipeIngredient as Json).length + asArray(n.recipeInstructions as Json).length }))
    .sort((a, b) => b.size - a.size)[0].n;

  const ingredients = asArray((node.recipeIngredient ?? node.ingredients) as Json)
    .map((i) => cleanText(i, 300))
    .filter(Boolean)
    .slice(0, 80);
  const instructions = instructionsOf(node.recipeInstructions as Json);

  const rating = node.aggregateRating && typeof node.aggregateRating === "object" && !Array.isArray(node.aggregateRating)
    ? (node.aggregateRating as Obj)
    : null;
  let ratingValue = rating ? numberOf(rating.ratingValue) : null;
  const bestRating = rating ? numberOf(rating.bestRating) ?? 5 : 5;
  if (ratingValue != null && bestRating && bestRating !== 5) ratingValue = (ratingValue / bestRating) * 5;
  if (ratingValue != null && (ratingValue <= 0 || ratingValue > 5)) ratingValue = null;
  const reviewCount = rating ? numberOf(rating.ratingCount) ?? numberOf(rating.reviewCount) : null;

  const domain = domainOf(url);
  const description = cleanText(node.description, 600) || null;
  const allText = [...instructions, ...ingredients, description ?? "", cleanText(node.name, 200)];

  return {
    url,
    domain,
    sourceName: lookupSource(domain)?.name ?? siteNameFromHtml(html) ?? domain,
    title: cleanText(node.name, 200) || "Untitled recipe",
    description,
    author: authorOf(node.author as Json),
    datePublished: typeof node.datePublished === "string" ? node.datePublished.slice(0, 25) : null,
    rating: ratingValue != null ? Math.round(ratingValue * 100) / 100 : null,
    reviewCount: reviewCount != null && reviewCount >= 0 ? Math.round(reviewCount) : null,
    recipeYield: yieldOf(node.recipeYield as Json),
    ingredients,
    instructions,
    prepMinutes: isoDurationToMinutes(node.prepTime),
    cookMinutes: isoDurationToMinutes(node.cookTime),
    totalMinutes: isoDurationToMinutes(node.totalTime),
    ovenTempC: findOvenTempC(instructions),
    panSize: findPanSize(allText),
    image: imageOf(node.image as Json),
    keywords: (typeof node.keywords === "string" ? node.keywords.split(/[,;]+/) : asArray(node.keywords as Json))
      .map((k) => cleanText(k, 40).toLowerCase())
      .filter(Boolean)
      .slice(0, 20),
    category: asArray(node.recipeCategory as Json).map((c) => cleanText(c, 40)).filter(Boolean)[0] ?? null,
    extractionMethod: "json-ld",
    extractedAt: new Date().toISOString(),
  };
}
