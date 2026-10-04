"use client";

import Link from "next/link";
import { BookOpen, CakeSlice, ExternalLink, FlaskConical, Globe, LifeBuoy, RefreshCw, ShoppingBasket, SlidersHorizontal, Star } from "lucide-react";
import type { RecipeIngredient } from "@/lib/types";
import type { RecipeResultProps } from "./RecipeResult";
import { Badge, Callout, Card, SectionHeading, Stat } from "./ui";
import { RecipeComparison } from "./RecipeComparison";
import { ShoppingList } from "./ShoppingList";
import { SourcesList } from "./SourcesList";
import { RecipeActions } from "./RecipeActions";
import { Troubleshooting } from "./Troubleshooting";

/** Ingredient lines from a published page → minimal shopping items. */
const toShoppingItems = (lines: string[]): RecipeIngredient[] =>
  lines.map((line) => ({
    group: "Recipe",
    name: line,
    grams: null,
    ml: null,
    householdMeasure: null,
    notes: null,
    role: "",
    shoppingName: line
      .toLowerCase()
      .replace(/^[\d\s/½¼¾⅓⅔.,-]+/, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\b(cups?|tbsp|tablespoons?|tsp|teaspoons?|grams?|g|ml|oz|ounces?|large|small|medium)\b/g, "")
      .split(",")[0]
      .trim()
      .slice(0, 60) || line.slice(0, 60),
  }));

/**
 * Shown when no curated recipe matched: the top-ranked published recipes from live web research.
 * We show the facts (ingredients, times, ratings) and link to the original for the full method.
 */
export function WebResult({ result, mode = "live", saved, onNewSearch, onEditRequirements, onRefresh, onPickRecipe }: RecipeResultProps) {
  const top = result.sources.find((s) => s.role === "primary") ?? result.sources[0];
  if (!top) return <Callout tone="error">No recipes to show.</Callout>;
  const ingredients = toShoppingItems(top.ingredients);

  return (
    <article className="pt-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        {onNewSearch ? (
          <button onClick={onNewSearch} className="text-sm font-medium text-cocoa-500 hover:text-cocoa-700">← New search</button>
        ) : (
          <Link href="/" className="text-sm font-medium text-cocoa-500 hover:text-cocoa-700">← Find another recipe</Link>
        )}
        <div className="flex flex-wrap gap-2">
          {onEditRequirements && (
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onEditRequirements}><SlidersHorizontal className="h-3.5 w-3.5" /> Edit requirements</button>
          )}
          {onRefresh && (
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /> Search again</button>
          )}
        </div>
      </div>

      <div className="card mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-cocoa-700 via-cocoa-600 to-cocoa-500 px-5 py-7 text-cream-50 sm:px-8 sm:py-9">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Globe className="h-3.5 w-3.5" /> Top-ranked published recipe
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{top.title}</h1>
          <p className="mt-2 text-sm text-cream-100/90">
            by {top.author ?? top.sourceName} · {top.sourceName}
            {top.rating != null && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-caramel-300 text-caramel-300" /> {top.rating.toFixed(1)}
                {top.reviewCount != null && ` (${top.reviewCount.toLocaleString()} ratings)`}
              </span>
            )}
          </p>
          <p className="mt-3 max-w-3xl text-xs text-cream-100/70">
            We don&apos;t have this cake in our curated library yet, so we searched the web and ranked published recipes. Based on the recipes we
            researched, this is the highest-ranked option for your requirements.
          </p>
          <a href={top.url} target="_blank" rel="noopener noreferrer" className="btn mt-5 bg-cream-50 text-cocoa-800 hover:bg-white">
            Open the full recipe on {top.sourceName} <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="px-5 py-5 sm:px-8">
          {mode !== "shared" ? <RecipeActions result={result} ingredients={[]} savedId={saved?.id} initialFavorite={saved?.favorite} initialShareId={saved?.shareId} /> : null}
        </div>
      </div>

      <div className="space-y-6">
        {result.library && onPickRecipe && (
          <Callout tone="info" title="Prefer a recipe from our curated library?">
            The closest one we have is{" "}
            <button className="font-semibold underline" onClick={() => onPickRecipe(result.library!.cakeId)}>
              {result.library.alternatives.find((a) => a.cakeId === result.library!.cakeId)?.name ?? "our closest match"}
            </button>
            {" "}— fully written out, scaled to your size, with frosting quantities.
          </Callout>
        )}

        <Card className="p-5 sm:p-7">
          <SectionHeading icon={<CakeSlice className="h-5 w-5" />} title="At a glance" subtitle={`From ${top.sourceName} — quantities as published`} />
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Yield" value={top.recipeYield ?? "—"} />
            <Stat label="Pan" value={top.panSize ?? "—"} />
            <Stat label="Oven" value={top.ovenTempC ? `${top.ovenTempC}°C` : "—"} />
            <Stat label="Bake" value={top.cookMinutes ? `${top.cookMinutes} min` : "—"} />
          </div>
          <h3 className="mb-2 text-sm font-semibold text-cocoa-700">Ingredients</h3>
          <ul className="grid gap-x-6 gap-y-1.5 text-sm text-cocoa-700 sm:grid-cols-2">
            {top.ingredients.map((i) => <li key={i} className="border-b border-cream-200 pb-1.5">{i}</li>)}
          </ul>
          <a href={top.url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5">
            Read the method on {top.sourceName} <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-2 text-xs text-cocoa-400">The method is the author&apos;s work, so we link to it rather than copying it.</p>
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionHeading icon={<FlaskConical className="h-5 w-5" />} title="How the recipes compare" />
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Research confidence" value={<Badge tone={result.confidence.level === "High" ? "good" : result.confidence.level === "Medium" ? "warn" : "bad"} className="text-xs">{result.confidence.level}</Badge>} />
            <Stat label="Recipes compared" value={result.confidence.recipesCompared} hint={`${result.confidence.recipesFound} usable found`} />
            <Stat label="Sources analyzed" value={result.confidence.sourcesAnalyzed} />
            <Stat label="Requirements matched" value={`${result.confidence.requirementsMatchedPct}%`} hint="top recipe" />
          </div>
          <p className="mb-5 text-sm text-cocoa-500">{result.confidence.explanation}</p>
          <RecipeComparison result={result} />
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionHeading icon={<ShoppingBasket className="h-5 w-5" />} title="Where to buy" subtitle="Nearby stores for the top recipe's ingredients" />
          <ShoppingList ingredients={ingredients} initialLocation={result.requirements.location} />
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionHeading icon={<LifeBuoy className="h-5 w-5" />} title="Something went wrong?" action={<Link href="/troubleshooting" className="text-xs font-semibold text-cocoa-600 underline">All problems →</Link>} />
          <Troubleshooting compact limitIds={["sank", "dense", "dry", "gummy", "stuck", "cracked"]} />
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionHeading icon={<BookOpen className="h-5 w-5" />} title="Sources researched" />
          <SourcesList result={result} />
        </Card>
      </div>
    </article>
  );
}
