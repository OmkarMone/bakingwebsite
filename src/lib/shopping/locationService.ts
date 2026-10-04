import "server-only";
import { USER_AGENT } from "@/lib/server/env";
import { sharedCache } from "@/lib/server/memoryCache";

/**
 * Geocoding via OpenStreetMap Nominatim (usage policy: identify via User-Agent,
 * ≤1 req/s, cache results). Coordinates are used transiently and never persisted.
 */
export interface ResolvedArea {
  label: string;
  countryCode: string | null;
  lat: number;
  lon: number;
}

const cache = sharedCache<ResolvedArea | null>("geocode", 500);
let lastCall = 0;

async function politeFetch(url: string) {
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT(), "Accept-Language": "en" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  return res.json();
}

type NominatimAddress = Record<string, string | undefined>;

function areaLabel(addr: NominatimAddress | undefined, fallback: string): string {
  if (!addr) return fallback;
  const local = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.city_district ?? addr.town ?? addr.village;
  const city = addr.city ?? addr.state_district ?? addr.state;
  const country = addr.country;
  return [local, city !== local ? city : null, country !== city ? country : null].filter(Boolean).join(", ") || fallback;
}

export async function geocodeArea(text: string, countryCode?: string | null): Promise<ResolvedArea | null> {
  const key = `f:${countryCode ?? ""}:${text.toLowerCase().trim()}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const params = new URLSearchParams({ q: text, format: "jsonv2", addressdetails: "1", limit: "1" });
  if (countryCode) params.set("countrycodes", countryCode);
  const data = (await politeFetch(`https://nominatim.openstreetmap.org/search?${params}`)) as {
    lat: string;
    lon: string;
    display_name: string;
    address?: NominatimAddress;
  }[];
  const first = data[0];
  const result = first
    ? {
        label: areaLabel(first.address, first.display_name.split(",").slice(0, 3).join(",")),
        countryCode: first.address?.country_code?.toLowerCase() ?? countryCode ?? null,
        lat: Number(first.lat),
        lon: Number(first.lon),
      }
    : null;
  cache.set(key, result, 7 * 24 * 60 * 60_000);
  return result;
}

export async function reverseGeocode(lat: number, lon: number): Promise<ResolvedArea | null> {
  // round to ~1 km for the cache key and request — we only need the neighbourhood
  const rl = Math.round(lat * 100) / 100;
  const ro = Math.round(lon * 100) / 100;
  const key = `r:${rl}:${ro}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const data = (await politeFetch(
    `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({ lat: String(rl), lon: String(ro), format: "jsonv2", zoom: "14", addressdetails: "1" })}`,
  )) as { address?: NominatimAddress; display_name?: string; error?: string };
  const result = data.error
    ? null
    : { label: areaLabel(data.address, data.display_name ?? "Your area"), countryCode: data.address?.country_code?.toLowerCase() ?? null, lat, lon };
  cache.set(key, result, 7 * 24 * 60 * 60_000);
  return result;
}
