"use client";

import { useState } from "react";
import { ArrowRight, BookOpenCheck, Loader2, Scale, ShieldCheck, ShoppingBasket, Sparkles } from "lucide-react";

const EXAMPLES = [
  "I want to make a 1 kg eggless chocolate cake for a birthday",
  "Moist vanilla sponge with whipped cream, less sweet, in an OTG",
  "Vegan red velvet cupcakes with cream cheese frosting",
  "Gluten-free lemon drizzle loaf for 8 people",
  "Pandan chiffon cake, I live in Singapore",
];

export function RecipeForm({
  initialQuery = "",
  onSubmit,
  loading,
}: {
  initialQuery?: string;
  onSubmit: (q: string) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState(initialQuery);
  const valid = q.trim().length >= 3;

  return (
    <section className="relative pt-10 sm:pt-16">
      <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-80 max-w-3xl rounded-full bg-gradient-to-br from-caramel-100 via-berry-50 to-cream-200 opacity-80 blur-3xl" />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-cream-50 px-3 py-1 text-xs font-medium text-cocoa-500 shadow-card">
          <Sparkles className="h-3.5 w-3.5 text-caramel-500" aria-hidden />
          Research-backed recipes, not guesses
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-cocoa-800 sm:text-5xl md:text-6xl">
          What cake do you <span className="text-berry-500">want to bake?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-cocoa-500 sm:text-base">
          We search reputable baking sites, compare their ratios and techniques, and build one reliable recipe for your
          exact needs — with every source linked.
        </p>
      </div>

      <form
        className="card mx-auto mt-8 max-w-3xl p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !loading) onSubmit(q.trim());
        }}
      >
        <label htmlFor="cake-query" className="sr-only">
          Describe the cake you want to bake
        </label>
        <textarea
          id="cake-query"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (valid && !loading) onSubmit(q.trim());
            }
          }}
          rows={3}
          maxLength={600}
          placeholder="e.g. I want to make a 1 kg eggless chocolate cake for a birthday, very moist, with chocolate ganache. I live in Singapore."
          className="w-full resize-none rounded-2xl border-0 bg-transparent px-3 py-2 text-base text-cocoa-800 placeholder:text-cocoa-400/70 focus:outline-none sm:text-lg"
        />
        <div className="flex flex-col-reverse gap-3 border-t border-cream-200 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-cocoa-400">You can refine every detail on the next step. Optional questions can be skipped.</p>
          <button type="submit" className="btn-primary" disabled={!valid || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? "Reading your request…" : "Continue"}
          </button>
        </div>
      </form>

      <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => setQ(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: BookOpenCheck, title: "Real recipe research", body: "We read published recipe data — ratings, reviews, yields, temperatures — from reputable sites." },
          { icon: ShieldCheck, title: "Transparent sources", body: "Every recipe we compared is linked. We never invent sources, ratings or prices." },
          { icon: Scale, title: "Scale & substitute", body: "Resize by weight or pan, swap ingredients with baking-chemistry guidance." },
          { icon: ShoppingBasket, title: "Where to buy", body: "Find nearby stores and the fewest stops to get everything." },
        ].map((f) => (
          <div key={f.title} className="card p-5">
            <f.icon className="h-5 w-5 text-caramel-500" aria-hidden />
            <h3 className="mt-3 text-sm font-semibold text-cocoa-800">{f.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-cocoa-500">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
