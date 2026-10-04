import type { CakeRequirements } from "@/lib/types";
import { focusDomains } from "./sources";

export interface SearchQuery {
  q: string;
  /** Restrict to these domains (provider implements natively or via site: operators) */
  includeDomains?: string[];
  purpose: string;
}

const APPLIANCE_TERMS: Record<string, string> = {
  otg: "OTG oven",
  air_fryer: "air fryer",
  microwave: "microwave",
  pressure_cooker: "pressure cooker (no oven)",
};

/** The core phrase, e.g. "eggless chocolate cake". */
export function corePhrase(r: CakeRequirements): string {
  const diet: string[] = [];
  if (r.vegan) diet.push("vegan");
  else {
    if (r.eggless) diet.push("eggless");
    if (r.dairyFree) diet.push("dairy-free");
  }
  if (r.glutenFree) diet.push("gluten-free");

  let cake = r.cakeType.toLowerCase().trim();
  const flavor = r.flavor?.toLowerCase().trim();
  if (flavor && !cake.includes(flavor)) cake = `${flavor} ${cake}`;
  if (!/\bcake|cupcake|torte|gateau|sponge|cheesecake|brownie|loaf|roll\b/.test(cake)) cake = `${cake} cake`;
  // avoid "eggless eggless chocolate cake"
  const words = new Set(cake.split(/\s+/));
  const prefix = diet.filter((d) => !words.has(d));
  return [...prefix, cake].join(" ").replace(/\s+/g, " ");
}

export function generateSearchQueries(r: CakeRequirements): SearchQuery[] {
  const core = corePhrase(r);
  const queries: SearchQuery[] = [
    { q: `${core} recipe`, purpose: "broad" },
    { q: `best ${core} recipe ${r.texture ? r.texture.toLowerCase() : "tested"}`.trim(), purpose: "quality" },
  ];

  const domains = focusDomains({
    countryCode: r.location?.countryCode,
    eggless: r.eggless,
    vegan: r.vegan,
    glutenFree: r.glutenFree,
  });

  queries.push({ q: `${core} recipe`, includeDomains: domains.global, purpose: "trusted baking sites" });

  const extra = [...new Set([...domains.specialty, ...domains.regional])].slice(0, 10);
  if (extra.length) queries.push({ q: `${core} recipe`, includeDomains: extra, purpose: "specialist & regional sites" });

  if (r.appliance && APPLIANCE_TERMS[r.appliance]) {
    queries.push({ q: `${core} recipe in ${APPLIANCE_TERMS[r.appliance]}`, purpose: "appliance" });
  }

  return queries.slice(0, 5);
}
