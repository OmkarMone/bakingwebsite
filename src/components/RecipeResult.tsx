"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CakeSlice,
  ChefHat,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  LifeBuoy,
  Microscope,
  Paintbrush,
  RefreshCw,
  Ruler,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { FinalRecipe, RecipeIngredient, ResearchResult } from "@/lib/types";
import { roundPan } from "@/lib/calc/recipeScaler";
import { frostingTypeFromText } from "@/lib/calc/frostingCalculator";
import { Badge, Callout, Card, SectionHeading, Stat } from "./ui";
import { ReferenceList } from "./SourcesList";
import { WebResult } from "./WebResult";
import { IngredientList } from "./IngredientList";
import { ShoppingList } from "./ShoppingList";
import { SourcesList } from "./SourcesList";
import { RecipeActions } from "./RecipeActions";
import { ScalingCalculator } from "./calculators/ScalingCalculator";
import { FrostingCalculator } from "./calculators/FrostingCalculator";
import { Troubleshooting } from "./Troubleshooting";

const NAV = [
  ["overview", "Overview"],
  ["research", "Why this recipe"],
  ["ingredients", "Ingredients"],
  ["method", "Method"],
  ["frosting", "Frosting"],
  ["shopping", "Where to buy"],
  ["troubleshooting", "Troubleshooting"],
  ["sources", "Sources"],
] as const;

const CONFIDENCE_TONE = { High: "good", Medium: "warn", Low: "bad" } as const;

export interface RecipeResultProps {
  result: ResearchResult;
  mode?: "live" | "saved" | "shared";
  saved?: { id: string; favorite: boolean; shareId: string | null };
  onNewSearch?: () => void;
  onEditRequirements?: () => void;
  onRefresh?: () => void;
  onPickRecipe?: (cakeId: string) => void;
}

export function RecipeResult(props: RecipeResultProps) {
  return props.result.recipe ? <LibraryRecipeView {...props} recipe={props.result.recipe} /> : <WebResult {...props} />;
}

function LibraryRecipeView({
  result,
  recipe: r,
  mode = "live",
  saved,
  onNewSearch,
  onEditRequirements,
  onRefresh,
  onPickRecipe,
}: RecipeResultProps & { recipe: FinalRecipe }) {
  const o = r.overview;
  const req = result.requirements;
  const [scaled, setScaled] = useState<{ ingredients: RecipeIngredient[]; factor: number }>({ ingredients: r.ingredients, factor: 1 });
  const [showScaler, setShowScaler] = useState(false);
  const basePan = useMemo(() => (o.panDiameterInches ? roundPan(o.panDiameterInches, 3) : null), [o.panDiameterInches]);
  const onScaled = useCallback((ingredients: RecipeIngredient[], factor: number) => setScaled({ ingredients, factor }), []);
  const errors = result.validation.filter((v) => v.level === "error");
  const warnings = result.validation.filter((v) => v.level === "warning");
  const [now] = useState(() => Date.now());
  const ageDays = Math.floor((now - new Date(result.researchedAt).getTime()) / 86_400_000);

  const troubleIds = useMemo(() => {
    const ids = ["sank", "dense", "dry", "gummy", "stuck"];
    if (req.eggless || req.vegan) ids.unshift("sticky-top-eggless");
    if (req.appliance === "otg" || req.appliance === "air_fryer") ids.unshift("uneven-otg");
    const f = (req.frosting ?? r.frostingNotes ?? "").toLowerCase();
    if (f.includes("ganache")) ids.push("ganache-runny", "ganache-thick");
    if (f.includes("whipped")) ids.push("cream-overwhipped", "frosting-melted");
    if (f.includes("buttercream")) ids.push("buttercream-curdled", "frosting-melted");
    return [...new Set(ids)];
  }, [req, r.frostingNotes]);

  return (
    <article className="pt-6">
      {/* Header */}
      <header className="mb-6">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
          {onNewSearch ? (
            <button onClick={onNewSearch} className="text-sm font-medium text-cocoa-500 hover:text-cocoa-700">
              ← New search
            </button>
          ) : (
            <Link href="/" className="text-sm font-medium text-cocoa-500 hover:text-cocoa-700">
              ← Find another recipe
            </Link>
          )}
          <div className="flex flex-wrap gap-2">
            {onEditRequirements && (
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onEditRequirements}>
                <SlidersHorizontal className="h-3.5 w-3.5" /> Edit requirements
              </button>
            )}
            {onRefresh && (
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onRefresh} title="Re-run web research now">
                <RefreshCw className="h-3.5 w-3.5" /> Re-research
              </button>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-cocoa-700 via-cocoa-600 to-cocoa-500 px-5 py-7 text-cream-50 sm:px-8 sm:py-9">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" /> {result.library?.closestOnly ? "Closest match from our library" : "From our curated library"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <Microscope className="h-3.5 w-3.5" /> Match confidence: {result.confidence.level}
              </span>
              {result.cached && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Researched {ageDays === 0 ? "today" : `${ageDays} day${ageDays === 1 ? "" : "s"} ago`}</span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{r.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cream-100/90 sm:text-base">{r.summary}</p>
            <p className="mt-3 text-xs text-cream-100/70">
              A tested-style recipe from our curated library, scaled and adapted to your requirements — no AI involved.
            </p>
          </div>
          <div className="space-y-4 px-5 py-5 sm:px-8">
            {mode !== "shared" ? (
              <RecipeActions result={result} ingredients={scaled.ingredients} savedId={saved?.id} initialFavorite={saved?.favorite} initialShareId={saved?.shareId} />
            ) : (
              <p className="text-xs text-cocoa-400">Shared from CakeRecipe Finder.</p>
            )}
          </div>
        </div>
      </header>

      {/* In-page nav */}
      <nav aria-label="Recipe sections" className="no-print sticky top-[61px] z-30 -mx-4 mb-6 overflow-x-auto border-y border-cream-200 bg-cream-100/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-2">
        <ul className="flex min-w-max gap-1">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-full px-3 py-1.5 text-xs font-medium text-cocoa-600 hover:bg-cream-200">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6">
        {(errors.length > 0 || warnings.length > 0 || r.warnings.length > 0) && (
          <Callout tone={errors.length ? "error" : "warn"} title={errors.length ? "Please review before baking" : "Notes before you bake"}>
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((e) => <li key={e.message}>{e.message}</li>)}
              {r.warnings.map((w) => <li key={w}>{w}</li>)}
              {warnings.map((w) => <li key={w.message}>{w.message}</li>)}
            </ul>
          </Callout>
        )}

        {/* Overview */}
        <Card className="p-5 sm:p-7">
          <SectionHeading id="overview" icon={<ClipboardList className="h-5 w-5" />} title="Recipe overview" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Cake" value={o.cakeType} />
            <Stat label="Weight" value={`~${o.finishedWeightGrams >= 1000 ? `${(o.finishedWeightGrams / 1000).toFixed(o.finishedWeightGrams % 1000 ? 1 : 0)} kg` : `${o.finishedWeightGrams} g`}`} hint="Approximate, finished" />
            <Stat label="Servings" value={o.servings} />
            <Stat label="Difficulty" value={o.difficulty} />
            <Stat label="Prep" value={`${o.prepMinutes} min`} />
            <Stat label="Bake" value={`${o.bakeMinutesMin}–${o.bakeMinutesMax} min`} />
            <Stat label="Total" value={o.totalMinutes >= 120 ? `${Math.floor(o.totalMinutes / 60)} h ${o.totalMinutes % 60 ? `${o.totalMinutes % 60} min` : ""}` : `${o.totalMinutes} min`} hint="Incl. cooling" />
            <Stat label="Oven" value={`${o.ovenTempC}°C / ${o.ovenTempF}°F`} />
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <Stat label="Pan" value={`${o.panSize}${o.panCount > 1 ? ` × ${o.panCount}` : ""}`} />
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <Stat label="Expected texture" value={o.expectedTexture} />
            </div>
          </div>
          {o.applianceNotes && (
            <p className="mt-4 rounded-2xl bg-caramel-100/60 px-4 py-3 text-sm text-cocoa-700">
              <strong className="font-semibold">Appliance notes:</strong> {o.applianceNotes}
            </p>
          )}
        </Card>

        {/* Why this recipe */}
        <Card className="p-5 sm:p-7">
          <SectionHeading id="research" icon={<FlaskConical className="h-5 w-5" />} title="Why this recipe" subtitle="How it matches your request, and the published recipes behind it" />
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Match confidence" value={<Badge tone={CONFIDENCE_TONE[result.confidence.level]} className="text-xs">{result.confidence.level}</Badge>} />
            <Stat label="Requirements matched" value={`${result.confidence.requirementsMatchedPct}%`} />
            <Stat label="Cross-checked against" value={`${result.references.length} recipes`} hint={`${result.confidence.sourcesAnalyzed} sites`} />
            <Stat label="Scaled" value={result.library && result.library.scaleFactor !== 1 ? `×${result.library.scaleFactor.toFixed(2)}` : "Original size"} />
          </div>
          <p className="mb-4 text-sm text-cocoa-500">{result.confidence.explanation}</p>
          {result.library && result.library.reasons.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {result.library.reasons.map((x) => <Badge key={x} tone="good">{x}</Badge>)}
            </div>
          )}
          {r.keyDecisions.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-cocoa-700">Key decisions in this recipe</h3>
              <ul className="space-y-2">
                {r.keyDecisions.map((d) => (
                  <li key={d.decision} className="rounded-2xl bg-cream-100 px-4 py-3 text-sm">
                    <p className="font-medium text-cocoa-800">{d.decision}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-cocoa-500">{d.rationale}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <h3 className="mb-2 text-sm font-semibold text-cocoa-700">Published recipes we cross-checked</h3>
          <ReferenceList references={result.references} />
          {onPickRecipe && result.library && result.library.alternatives.length > 0 && (
            <div className="no-print mt-6">
              <h3 className="mb-2 text-sm font-semibold text-cocoa-700">Other recipes from our library that fit</h3>
              <div className="flex flex-wrap gap-2">
                {result.library.alternatives.map((a) => (
                  <button key={a.cakeId} className="chip" onClick={() => onPickRecipe(a.cakeId)}>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Ingredients */}
        <Card className="p-5 sm:p-7">
          <SectionHeading
            id="ingredients"
            icon={<CakeSlice className="h-5 w-5" />}
            title="Ingredients"
            subtitle="Weights in grams for accuracy — spoon & cup equivalents alongside"
            action={
              <button className="btn-ghost no-print px-3 py-1.5 text-xs" onClick={() => setShowScaler((s) => !s)} aria-expanded={showScaler}>
                <Ruler className="h-3.5 w-3.5" /> Scale / change pan
              </button>
            }
          />
          <div className={showScaler ? "no-print mb-6 rounded-3xl border border-cream-200 bg-cream-100 p-4" : "hidden"}>
            <ScalingCalculator
              ingredients={r.ingredients}
              basePan={basePan}
              baseWeightG={o.finishedWeightGrams}
              baseBakeMin={o.bakeMinutesMin}
              baseBakeMax={o.bakeMinutesMax}
              ovenTempC={o.ovenTempC}
              onScaled={onScaled}
              compact
            />
          </div>
          <IngredientList ingredients={scaled.ingredients} req={req} factor={scaled.factor} />
        </Card>

        {/* Method */}
        <Card className="p-5 sm:p-7">
          <SectionHeading id="method" icon={<ChefHat className="h-5 w-5" />} title="Method" />
          <ol className="space-y-4">
            {r.method.map((m, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cocoa-700 text-sm font-semibold text-cream-50">{i + 1}</span>
                <div className="min-w-0 pt-1">
                  <p className="font-semibold text-cocoa-800">{m.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-cocoa-600">{m.text}</p>
                  {m.why && <p className="mt-1.5 rounded-xl bg-cream-100 px-3 py-2 text-xs leading-relaxed text-cocoa-500"><strong className="font-semibold">Why:</strong> {m.why}</p>}
                </div>
              </li>
            ))}
          </ol>

          {r.whyItWorks.length > 0 && (
            <details className="group mt-6 rounded-2xl border border-cream-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-cocoa-700">
                <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-caramel-500" /> Why this recipe works</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <dl className="space-y-3 border-t border-cream-200 px-4 py-4">
                {r.whyItWorks.map((w) => (
                  <div key={w.topic}>
                    <dt className="text-sm font-semibold text-cocoa-800">{w.topic}</dt>
                    <dd className="text-sm leading-relaxed text-cocoa-600">{w.explanation}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          {r.storage && (
            <p className="mt-4 text-sm text-cocoa-600">
              <strong className="font-semibold">Storage:</strong> {r.storage}
            </p>
          )}
        </Card>

        {/* Frosting & decoration */}
        <Card className="p-5 sm:p-7">
          <SectionHeading id="frosting" icon={<Paintbrush className="h-5 w-5" />} title="Frosting & decoration" subtitle="How much you need — approximate" />
          {r.frostingNotes && <p className="mb-4 text-sm leading-relaxed text-cocoa-600">{r.frostingNotes}</p>}
          {r.decorationSuggestions.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-sm font-semibold text-cocoa-700">Decoration ideas{req.decorationStyle ? ` for a ${req.decorationStyle} cake` : ""}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {r.decorationSuggestions.map((d) => (
                  <li key={d} className="rounded-2xl bg-cream-100 px-4 py-2.5 text-sm text-cocoa-700">{d}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="no-print">
            <FrostingCalculator
              defaultType={frostingTypeFromText(req.frosting ?? r.frostingNotes) ?? undefined}
              defaultDiameterIn={o.panDiameterInches ?? 8}
              defaultLayers={Math.max(1, o.panCount)}
              compact
            />
          </div>
        </Card>

        {/* Shopping */}
        <Card className="p-5 sm:p-7">
          <SectionHeading id="shopping" icon={<ShoppingBasket className="h-5 w-5" />} title="Where to buy" subtitle="Nearby stores and the fewest stops to get everything" />
          <ShoppingList ingredients={scaled.ingredients} initialLocation={req.location} />
        </Card>

        {/* Troubleshooting */}
        <Card className="p-5 sm:p-7">
          <SectionHeading
            id="troubleshooting"
            icon={<LifeBuoy className="h-5 w-5" />}
            title="Something went wrong?"
            action={<Link href="/troubleshooting" className="text-xs font-semibold text-cocoa-600 underline">All problems →</Link>}
          />
          <Troubleshooting compact limitIds={troubleIds} />
        </Card>

        {/* Sources */}
        <Card className="p-5 sm:p-7">
          <SectionHeading id="sources" icon={<BookOpen className="h-5 w-5" />} title="Sources" />
          <SourcesList result={result} />
        </Card>

        {result.confidence.level === "Low" && (
          <Callout tone="warn">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Research confidence is low — we found few reliable matching recipes. Consider a test bake before an important occasion.
            </span>
          </Callout>
        )}
      </div>
    </article>
  );
}
