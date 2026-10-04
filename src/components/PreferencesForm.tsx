"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { APPLIANCES } from "@/lib/types";
import type { Preferences } from "@/lib/preferences";
import { api } from "@/lib/client/api";
import { Callout } from "./ui";

const APPLIANCE_LABEL: Record<(typeof APPLIANCES)[number], string> = {
  oven: "Oven",
  otg: "OTG",
  air_fryer: "Air fryer",
  microwave: "Microwave",
  pressure_cooker: "No oven (cooker/kadai)",
};
const SIZES = [500, 750, 1000, 1500, 2000];
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function PreferencesForm() {
  const [p, setP] = useState<Preferences | null>(null);
  const [database, setDatabase] = useState(true);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => setP((cur) => (cur ? { ...cur, [k]: v } : cur));

  useEffect(() => {
    api<{ preferences: Preferences; database: boolean }>("/api/preferences")
      .then((r) => {
        setP(r.preferences);
        setDatabase(r.database);
      })
      .catch((e) => setStatus({ tone: "error", text: (e as Error).message }));
  }, []);

  if (!p) return <p className="flex items-center gap-2 text-sm text-cocoa-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await api("/api/preferences", { method: "PUT", json: p });
      setStatus({ tone: "success", text: "Preferences saved." });
    } catch (e) {
      setStatus({ tone: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const tri = (k: "eggless" | "vegan" | "glutenFree", label: string) => (
    <button type="button" aria-pressed={!!p[k]} className={`chip ${p[k] ? "chip-active" : ""}`} onClick={() => set(k, p[k] ? null : true)}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {!database && <Callout tone="warn">Preferences can&apos;t be saved because no database is configured.</Callout>}
      <div className="card space-y-6 p-5 sm:p-7">
        <div>
          <span className="label">Dietary defaults</span>
          <div className="flex flex-wrap gap-2">{tri("eggless", "Eggless")}{tri("vegan", "Vegan")}{tri("glutenFree", "Gluten-free")}</div>
        </div>
        <div>
          <span className="label">Preferred sweetness</span>
          <div className="flex flex-wrap gap-2">
            {(["less", "regular", "extra"] as const).map((s) => (
              <button key={s} type="button" className={`chip ${p.sweetness === s ? "chip-active" : ""}`} onClick={() => set("sweetness", p.sweetness === s ? null : s)}>
                {s === "less" ? "Less sweet" : s === "extra" ? "Extra sweet" : "Regular"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Usual cake size</span>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((w) => (
              <button key={w} type="button" className={`chip ${p.preferredWeightGrams === w ? "chip-active" : ""}`} onClick={() => set("preferredWeightGrams", p.preferredWeightGrams === w ? null : w)}>
                {w >= 1000 ? `${w / 1000} kg` : `${w} g`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">I usually bake with</span>
          <div className="flex flex-wrap gap-2">
            {APPLIANCES.map((a) => (
              <button key={a} type="button" className={`chip ${p.appliance === a ? "chip-active" : ""}`} onClick={() => set("appliance", p.appliance === a ? null : a)}>
                {APPLIANCE_LABEL[a]}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">Equipment I own (comma separated)</span>
          <input className="input" defaultValue={p.equipment.join(", ")} onBlur={(e) => set("equipment", list(e.target.value).slice(0, 20))} placeholder="8-inch round pans, stand mixer, turntable" />
        </label>
        <label className="block">
          <span className="label">Preferred stores (comma separated)</span>
          <input className="input" defaultValue={p.preferredStores.join(", ")} onBlur={(e) => set("preferredStores", list(e.target.value).slice(0, 10))} placeholder="FairPrice, Phoon Huat" />
        </label>
        <label className="block">
          <span className="label">Default shopping area</span>
          <input className="input" value={p.defaultArea ?? ""} onChange={(e) => set("defaultArea", e.target.value || null)} placeholder="e.g. Tampines, Singapore" maxLength={160} />
          <span className="mt-1 block text-[11px] text-cocoa-400">Only this text label is stored — never your precise location or coordinates.</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving || !database}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save preferences
        </button>
        {status && <span className={`text-sm ${status.tone === "success" ? "text-pistachio-700" : "text-berry-600"}`} role="status">{status.text}</span>}
      </div>
    </div>
  );
}
