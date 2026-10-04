"use client";

import { useState } from "react";
import { Crosshair, Loader2, MapPin, X } from "lucide-react";
import type { UserLocation } from "@/lib/types";
import { api } from "@/lib/client/api";

/**
 * Location is only used to find nearby stores. Precise coordinates are requested only when the
 * user clicks "Use my current location" and the browser grants permission; they are never stored.
 */
export function LocationPicker({
  value,
  onChange,
  compact = false,
}: {
  value: UserLocation | null;
  onChange: (loc: UserLocation | null) => void;
  compact?: boolean;
}) {
  const [text, setText] = useState(value && !value.precise ? value.label : "");
  const [busy, setBusy] = useState<"gps" | "text" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const useGps = () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location. Enter a postal code or area instead.");
      return;
    }
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const area = await api<{ label: string; countryCode: string | null }>("/api/geocode", {
            method: "POST",
            json: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          });
          onChange({ label: area.label, countryCode: area.countryCode, lat: pos.coords.latitude, lon: pos.coords.longitude, precise: true });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(null);
        }
      },
      (err) => {
        setBusy(null);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was not granted — no problem, enter a postal code or area instead."
            : "We couldn't get your location. Enter a postal code or area instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  };

  const lookupText = async () => {
    const t = text.trim();
    if (t.length < 2) return;
    setError(null);
    setBusy("text");
    try {
      const area = await api<{ label: string; countryCode: string | null; lat: number; lon: number }>("/api/geocode", {
        method: "POST",
        json: { text: t, countryCode: value?.countryCode ?? null },
      });
      onChange({ label: area.label, countryCode: area.countryCode, lat: area.lat, lon: area.lon, precise: false });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      {value && (value.lat != null || value.precise) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-pistachio-500/30 bg-pistachio-50 px-4 py-2.5 text-sm text-pistachio-700">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden />
            Near <strong className="font-semibold">{value.label}</strong>
            {value.precise && <span className="text-xs opacity-80">(current location — not stored)</span>}
          </span>
          <button type="button" className="text-xs font-medium underline" onClick={() => { onChange(null); setText(""); }}>
            Change
          </button>
        </div>
      ) : (
        <div className={`flex flex-col gap-2 ${compact ? "" : "sm:flex-row"}`}>
          <button type="button" className="btn-ghost shrink-0" onClick={useGps} disabled={busy !== null}>
            {busy === "gps" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            Use my current location
          </button>
          <div className="relative flex flex-1 gap-2">
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookupText();
                }
              }}
              placeholder="Enter postal code / area, e.g. 520123 or Tampines"
              aria-label="Postal code or area"
              maxLength={160}
            />
            {value && !value.lat && (
              <button type="button" aria-label="Clear location" className="absolute right-24 top-1/2 -translate-y-1/2 text-cocoa-400" onClick={() => { onChange(null); setText(""); }}>
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="button" className="btn-ghost shrink-0" onClick={lookupText} disabled={busy !== null || text.trim().length < 2}>
              {busy === "text" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
            </button>
          </div>
        </div>
      )}
      {value && value.lat == null && !value.precise && (
        <p className="text-xs text-cocoa-400">
          We&apos;ll look for stores around <strong>{value.label}</strong>. Add a postal code or neighbourhood for nearer results.
        </p>
      )}
      {error && <p className="text-xs text-berry-600" role="alert">{error}</p>}
    </div>
  );
}
