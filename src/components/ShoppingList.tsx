"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Globe, Info, Loader2, MapPin, Navigation, Store } from "lucide-react";
import type { RecipeIngredient, UserLocation } from "@/lib/types";
import { api } from "@/lib/client/api";
import { formatGrams, formatMl } from "@/lib/calc/units";
import { LocationPicker } from "./LocationPicker";
import { Badge, Callout } from "./ui";

interface StoreDto {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  chain: string | null;
  address: string | null;
  distanceKm: number | null;
  mapsUrl: string;
  website: string | null;
  openNow: boolean | null;
}

interface ShoppingResponse {
  area: { label: string; countryCode: string | null };
  provider: string;
  storeError: string | null;
  stores: StoreDto[];
  online: { name: string; typeLabel: string; website: string | null }[];
  perIngredient: {
    item: string;
    uses: string[];
    options: { store: string; type: string; distanceKm: number | null; likelihood: "likely" | "possible" }[];
    availability: string;
    price: string;
  }[];
  plan: {
    stops: { store: StoreDto; items: string[]; likelihood: "likely" | "possible" }[];
    uncovered: string[];
    primaryCoveragePct: number;
    summary: string;
  };
  disclaimer: string;
}

const qty = (i: RecipeIngredient) => (i.grams != null ? formatGrams(i.grams) : i.ml != null ? formatMl(i.ml) : i.householdMeasure ?? "");

export function StoreCard({ store }: { store: StoreDto }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-cocoa-800">{store.name}</p>
        <p className="text-xs text-cocoa-400">
          {store.typeLabel}
          {store.distanceKm != null && ` · ${store.distanceKm} km`}
          {store.openNow != null && (store.openNow ? " · Open now" : " · Closed now")}
        </p>
        {store.address && <p className="mt-0.5 truncate text-[11px] text-cocoa-400">{store.address}</p>}
      </div>
      <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0 px-3 py-1.5 text-xs" aria-label={`Open ${store.name} in maps`}>
        <Navigation className="h-3.5 w-3.5" /> Map
      </a>
    </div>
  );
}

export function ShoppingList({ ingredients, initialLocation }: { ingredients: RecipeIngredient[]; initialLocation: UserLocation | null }) {
  const [location, setLocation] = useState<UserLocation | null>(initialLocation);
  const [data, setData] = useState<ShoppingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (loc: UserLocation) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<ShoppingResponse>("/api/shopping", {
        method: "POST",
        json: {
          location: loc,
          ingredients: ingredients.map((i) => ({ name: i.name, shoppingName: i.shoppingName || i.name, quantity: qty(i) })),
        },
      });
      setData(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="no-print">
        <LocationPicker
          value={location}
          onChange={(loc) => {
            setLocation(loc);
            setData(null);
          }}
        />
        {location && !data && (
          <button className="btn-primary mt-3" onClick={() => search(location)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
            {loading ? "Finding nearby stores…" : "Where should I buy everything?"}
          </button>
        )}
        {!location && <p className="mt-2 text-xs text-cocoa-400">Share your location or enter a postal code / area to see nearby stores.</p>}
      </div>

      {error && <Callout tone="error">{error}</Callout>}

      {data && (
        <>
          {data.storeError && <Callout tone="warn">{data.storeError}</Callout>}

          {/* Best plan */}
          <div className="rounded-3xl border border-cocoa-700/10 bg-gradient-to-br from-cream-50 to-caramel-100/50 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-cocoa-800">
              <CheckCircle2 className="h-5 w-5 text-pistachio-500" /> Best option near {data.area.label}
            </h3>
            <p className="mt-1 text-sm text-cocoa-600">{data.plan.summary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.plan.stops.map((stop, i) => (
                <div key={stop.store.id} className="rounded-2xl border border-cream-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-berry-500">Stop {i + 1}</p>
                      <p className="font-semibold text-cocoa-800">{stop.store.name}</p>
                      <p className="text-xs text-cocoa-400">
                        {stop.store.typeLabel}
                        {stop.store.distanceKm != null ? ` · ${stop.store.distanceKm} km` : stop.store.type === "online" ? " · delivery" : ""}
                      </p>
                    </div>
                    <a href={stop.store.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-cocoa-400 hover:text-cocoa-700" aria-label={`Open ${stop.store.name}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-cocoa-700">
                    {stop.items.map((it) => (
                      <li key={it} className="flex items-start gap-1.5">
                        <span className="text-pistachio-500">✓</span> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {data.plan.uncovered.length > 0 && (
              <p className="mt-3 text-xs text-cocoa-500">Not matched to a nearby store: {data.plan.uncovered.join(", ")}. Try a baking supply shop or online grocer.</p>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-cocoa-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {data.disclaimer}
            </p>
          </div>

          {/* Per ingredient */}
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-[11px] uppercase tracking-wide text-cocoa-400">
                  <th className="py-2 pr-3 font-semibold">Ingredient</th>
                  <th className="px-2 py-2 font-semibold">Quantity</th>
                  <th className="px-2 py-2 font-semibold">Nearby options</th>
                  <th className="py-2 pl-2 font-semibold">Availability / price</th>
                </tr>
              </thead>
              <tbody>
                {data.perIngredient.map((p) => (
                  <tr key={p.item} className="border-b border-cream-200/70 align-top last:border-0">
                    <td className="py-2.5 pr-3 font-medium capitalize text-cocoa-800">{p.item}</td>
                    <td className="px-2 py-2.5 text-xs text-cocoa-500">{p.uses.join("; ")}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.options.length ? (
                          p.options.map((o) => (
                            <Badge key={o.store} tone={o.likelihood === "likely" ? "good" : "neutral"}>
                              {o.store}
                              {o.likelihood === "possible" ? " (maybe)" : ""}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-cocoa-400">Specialty — try a baking supplier</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pl-2 text-[11px] text-cocoa-400">
                      {p.availability}
                      <br />
                      {p.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stores */}
          {data.stores.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-cocoa-700">
                <MapPin className="h-4 w-4" /> Stores near {data.area.label} <span className="font-normal text-cocoa-400">· {data.provider}</span>
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.stores.slice(0, 9).map((s) => <StoreCard key={s.id} store={s} />)}
              </div>
            </div>
          )}
          {data.online.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-cocoa-700">
                <Globe className="h-4 w-4" /> Online & specialty retailers in your country
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.online.map((o) =>
                  o.website ? (
                    <a key={o.name} href={o.website} target="_blank" rel="noopener noreferrer" className="chip">
                      {o.name} <span className="text-cocoa-400">· {o.typeLabel}</span>
                    </a>
                  ) : (
                    <span key={o.name} className="chip">{o.name}</span>
                  ),
                )}
              </div>
            </div>
          )}
          <button className="btn-ghost no-print text-xs" onClick={() => location && search(location)}>
            Refresh stores
          </button>
        </>
      )}
    </div>
  );
}
