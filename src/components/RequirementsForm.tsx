"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, FlaskConical, Search } from "lucide-react";
import { APPLIANCES, DECORATION_STYLES, type CakeRequirementsInput } from "@/lib/types";
import type { Preferences } from "@/lib/preferences";
import { estimateServings } from "@/lib/requirementParser";
import { api } from "@/lib/client/api";
import { LocationPicker } from "./LocationPicker";

const WEIGHTS = [500, 750, 1000, 1500, 2000];
const APPLIANCE_LABEL: Record<(typeof APPLIANCES)[number], string> = {
  oven: "Oven",
  otg: "OTG",
  air_fryer: "Air fryer",
  microwave: "Microwave",
  pressure_cooker: "No oven (cooker/kadai)",
};
const FROSTINGS = ["Chocolate ganache", "Buttercream", "Swiss meringue buttercream", "Whipped cream", "Cream cheese frosting", "Chocolate frosting", "No frosting"];
const TEXTURES = ["Moist and soft", "Light and fluffy", "Rich and fudgy", "Dense and buttery", "Spongy"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

type TriState = boolean | null | undefined;

function Toggle({ label, value, onChange }: { label: string; value: TriState; onChange: (v: boolean | null) => void }) {
  return (
    <button
      type="button"
      aria-pressed={!!value}
      className={`chip ${value ? "chip-active" : ""}`}
      onClick={() => onChange(value ? null : true)}
    >
      {label}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-cocoa-400">{hint}</p>}
    </div>
  );
}

export function RequirementsForm({
  initial,
  onSubmit,
  onBack,
}: {
  initial: CakeRequirementsInput;
  onSubmit: (r: CakeRequirementsInput) => void;
  onBack: () => void;
}) {
  const [r, setR] = useState<CakeRequirementsInput>(initial);
  const [more, setMore] = useState(false);
  const [customWeight, setCustomWeight] = useState(initial.weightGrams && !WEIGHTS.includes(initial.weightGrams) ? String(initial.weightGrams) : "");
  const set = <K extends keyof CakeRequirementsInput>(k: K, v: CakeRequirementsInput[K]) => setR((p) => ({ ...p, [k]: v }));

  // Fill blanks from saved preferences (never overrides what the user just typed)
  useEffect(() => {
    let cancelled = false;
    api<{ preferences: Preferences }>("/api/preferences")
      .then(({ preferences: p }) => {
        if (cancelled) return;
        setR((cur) => ({
          ...cur,
          eggless: cur.eggless ?? p.eggless,
          vegan: cur.vegan ?? p.vegan,
          glutenFree: cur.glutenFree ?? p.glutenFree,
          sweetness: cur.sweetness ?? p.sweetness,
          appliance: cur.appliance ?? p.appliance,
          weightGrams: cur.weightGrams ?? p.preferredWeightGrams,
          equipment: cur.equipment?.length ? cur.equipment : p.equipment,
          location:
            cur.location ??
            (p.defaultArea ? { label: p.defaultArea, countryCode: p.defaultCountryCode, lat: null, lon: null, precise: false } : null),
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const valid = (r.cakeType ?? "").trim().length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...r, servings: r.servings ?? estimateServings(r.weightGrams) });
      }}
      className="mx-auto max-w-4xl"
    >
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-cocoa-500 hover:text-cocoa-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-3xl font-semibold tracking-tight text-cocoa-800 sm:text-4xl">Let&apos;s get the details right</h1>
      <p className="mt-2 text-sm text-cocoa-500">
        We filled in what we understood. Adjust anything — only the cake type is required.
      </p>

      <div className="card mt-6 space-y-6 p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cake *">
            <input className="input" value={r.cakeType ?? ""} onChange={(e) => set("cakeType", e.target.value)} placeholder="e.g. Chocolate cake" maxLength={80} required />
          </Field>
          <Field label="Flavor">
            <input className="input" value={r.flavor ?? ""} onChange={(e) => set("flavor", e.target.value || null)} placeholder="e.g. Chocolate, pandan" maxLength={80} />
          </Field>
        </div>

        <Field label="Dietary">
          <div className="flex flex-wrap gap-2">
            <Toggle label="Eggless" value={r.eggless} onChange={(v) => set("eggless", v)} />
            <Toggle label="Vegan" value={r.vegan} onChange={(v) => setR((p) => ({ ...p, vegan: v, eggless: v ? true : p.eggless, dairyFree: v ? true : p.dairyFree }))} />
            <Toggle label="Dairy-free" value={r.dairyFree} onChange={(v) => set("dairyFree", v)} />
            <Toggle label="Gluten-free" value={r.glutenFree} onChange={(v) => set("glutenFree", v)} />
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cake weight" hint="Approximate finished weight">
            <div className="flex flex-wrap gap-2">
              {WEIGHTS.map((w) => (
                <button key={w} type="button" className={`chip ${r.weightGrams === w ? "chip-active" : ""}`} onClick={() => { set("weightGrams", r.weightGrams === w ? null : w); setCustomWeight(""); }}>
                  {w >= 1000 ? `${w / 1000} kg` : `${w} g`}
                </button>
              ))}
              <input
                className="input w-28 py-1.5"
                inputMode="numeric"
                placeholder="Custom g"
                value={customWeight}
                aria-label="Custom weight in grams"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setCustomWeight(v);
                  const n = Number(v);
                  set("weightGrams", n >= 150 && n <= 10000 ? n : null);
                }}
              />
            </div>
          </Field>
          <Field label="Servings" hint={r.weightGrams && !r.servings ? `We'll assume about ${estimateServings(r.weightGrams)}` : undefined}>
            <input
              className="input"
              inputMode="numeric"
              value={r.servings ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, "").slice(0, 3));
                set("servings", n >= 1 ? n : null);
              }}
              placeholder="e.g. 10"
            />
          </Field>
        </div>

        <Field label="Baking with">
          <div className="flex flex-wrap gap-2">
            {APPLIANCES.map((a) => (
              <button key={a} type="button" className={`chip ${r.appliance === a ? "chip-active" : ""}`} onClick={() => set("appliance", r.appliance === a ? null : a)}>
                {APPLIANCE_LABEL[a]}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Texture">
            <input className="input" list="textures" value={r.texture ?? ""} onChange={(e) => set("texture", e.target.value || null)} placeholder="e.g. Moist and soft" maxLength={80} />
            <datalist id="textures">{TEXTURES.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Frosting">
            <input className="input" list="frostings" value={r.frosting ?? ""} onChange={(e) => set("frosting", e.target.value || null)} placeholder="e.g. Chocolate ganache" maxLength={80} />
            <datalist id="frostings">{FROSTINGS.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
        </div>

        <Field label="Sweetness">
          <div className="flex flex-wrap gap-2">
            {(["less", "regular", "extra"] as const).map((s) => (
              <button key={s} type="button" className={`chip ${r.sweetness === s ? "chip-active" : ""}`} onClick={() => set("sweetness", r.sweetness === s ? null : s)}>
                {s === "less" ? "Less sweet" : s === "extra" ? "Extra sweet" : "Regular"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Where are you? (for ingredient shopping)" hint="Optional. We never store your precise location.">
          <LocationPicker value={(r.location as never) ?? null} onChange={(loc) => set("location", loc)} />
        </Field>

        <div className="border-t border-cream-200 pt-4">
          <button type="button" onClick={() => setMore((m) => !m)} className="flex w-full items-center justify-between text-sm font-semibold text-cocoa-700" aria-expanded={more}>
            Decoration, equipment &amp; more (optional)
            <ChevronDown className={`h-4 w-4 transition ${more ? "rotate-180" : ""}`} />
          </button>
          {more && (
            <div className="mt-5 space-y-5">
              <Field label="Simple or decorated?">
                <div className="flex flex-wrap gap-2">
                  {DECORATION_STYLES.map((d) => (
                    <button key={d} type="button" className={`chip ${r.decorationStyle === d ? "chip-active" : ""}`} onClick={() => set("decorationStyle", r.decorationStyle === d ? null : d)}>
                      {d === "cartoon" ? "Cartoon character" : cap(d)}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Occasion">
                  <input className="input" value={r.occasion ?? ""} onChange={(e) => set("occasion", e.target.value || null)} placeholder="e.g. 6th birthday" maxLength={80} />
                </Field>
                <Field label="Budget">
                  <input className="input" value={r.budget ?? ""} onChange={(e) => set("budget", e.target.value || null)} placeholder="e.g. under S$30" maxLength={60} />
                </Field>
              </div>
              <Field label="Decoration notes">
                <textarea className="input min-h-20" value={r.decorationNotes ?? ""} onChange={(e) => set("decorationNotes", e.target.value || null)} placeholder="Colours, theme, toppers, piping…" maxLength={300} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Equipment you have" hint="Comma separated">
                  <input
                    className="input"
                    defaultValue={(r.equipment ?? []).join(", ")}
                    onBlur={(e) => set("equipment", e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20))}
                    placeholder="e.g. 8-inch pan, hand mixer"
                  />
                </Field>
                <Field label="Ingredients you already have" hint="Comma separated">
                  <input
                    className="input"
                    defaultValue={(r.availableIngredients ?? []).join(", ")}
                    onBlur={(e) => set("availableIngredients", e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40))}
                    placeholder="e.g. curd, condensed milk"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-cocoa-400">
          <FlaskConical className="h-4 w-4" aria-hidden /> We match your request against our curated recipe library — usually instant.
        </p>
        <button type="submit" className="btn-accent px-6 py-3 text-base" disabled={!valid}>
          <Search className="h-4 w-4" /> Find my recipe
        </button>
      </div>
    </form>
  );
}
