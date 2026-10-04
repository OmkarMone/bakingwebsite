"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Clock, Heart, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { Badge, Callout } from "./ui";

interface SavedItem {
  id: string;
  title: string;
  favorite: boolean;
  shared: boolean;
  createdAt: string;
  summary: string | null;
  weightGrams: number | null;
  difficulty: string | null;
  confidence: string | null;
}
interface HistoryItem {
  id: string;
  researchKey: string;
  title: string;
  query: string;
  createdAt: string;
}

export function MyRecipes() {
  const [recipes, setRecipes] = useState<SavedItem[] | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [database, setDatabase] = useState(true);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([api<{ recipes: SavedItem[]; database: boolean }>("/api/recipes"), api<{ history: HistoryItem[] }>("/api/history")])
      .then(([r, h]) => {
        setRecipes(r.recipes);
        setDatabase(r.database);
        setHistory(h.history);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const toggleFav = async (item: SavedItem) => {
    try {
      const r = await api<{ favorite: boolean }>(`/api/recipes/${item.id}`, { method: "PATCH", json: { favorite: !item.favorite } });
      setRecipes((list) => list?.map((x) => (x.id === item.id ? { ...x, favorite: r.favorite } : x)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (item: SavedItem) => {
    if (!window.confirm(`Delete "${item.title}" from My Recipes?`)) return;
    try {
      await api(`/api/recipes/${item.id}`, { method: "DELETE" });
      setRecipes((list) => list?.filter((x) => x.id !== item.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openHistory = async (h: HistoryItem) => {
    setOpening(h.id);
    try {
      const result = await api(`/api/research/${h.researchKey}`);
      sessionStorage.setItem("crf:last", JSON.stringify(result));
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
      setOpening(null);
    }
  };

  if (error) return <Callout tone="error">{error}</Callout>;
  if (!recipes) return <p className="flex items-center gap-2 text-sm text-cocoa-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your recipes…</p>;
  if (!database) return <Callout tone="warn" title="Saving is not enabled">This deployment has no database configured, so recipes can&apos;t be saved yet. You can still download or print any recipe.</Callout>;

  const shown = filter === "favorites" ? recipes.filter((r) => r.favorite) : recipes;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <div className="mb-4 flex gap-2">
          <button className={`chip ${filter === "all" ? "chip-active" : ""}`} onClick={() => setFilter("all")}>All saved ({recipes.length})</button>
          <button className={`chip ${filter === "favorites" ? "chip-active" : ""}`} onClick={() => setFilter("favorites")}>
            <Heart className="h-3.5 w-3.5" /> Favorites ({recipes.filter((r) => r.favorite).length})
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="card flex flex-col items-center p-10 text-center">
            <BookmarkPlus className="h-8 w-8 text-caramel-500" />
            <p className="mt-3 font-semibold text-cocoa-800">{filter === "favorites" ? "No favourites yet" : "No saved recipes yet"}</p>
            <p className="mt-1 max-w-sm text-sm text-cocoa-500">Research a cake and tap “Save recipe” — it will appear here.</p>
            <Link href="/" className="btn-primary mt-5">Find a recipe</Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {shown.map((r) => (
              <li key={r.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/recipe/${r.id}`} className="font-semibold text-cocoa-800 hover:text-berry-600">{r.title}</Link>
                  <button onClick={() => toggleFav(r)} aria-label={r.favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={r.favorite}>
                    <Heart className={`h-5 w-5 ${r.favorite ? "fill-berry-500 text-berry-500" : "text-cocoa-400"}`} />
                  </button>
                </div>
                {r.summary && <p className="mt-1.5 line-clamp-3 text-sm text-cocoa-500">{r.summary}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.weightGrams && <Badge>~{r.weightGrams} g</Badge>}
                  {r.difficulty && <Badge>{r.difficulty}</Badge>}
                  {r.confidence && <Badge tone={r.confidence === "High" ? "good" : r.confidence === "Medium" ? "warn" : "bad"}>{r.confidence} confidence</Badge>}
                  {r.shared && <Badge tone="dark">Shared</Badge>}
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 text-xs text-cocoa-400">
                  <span>Saved {new Date(r.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => remove(r)} className="inline-flex items-center gap-1 hover:text-berry-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-cocoa-700"><Clock className="h-4 w-4" /> Recipe history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-cocoa-400">Your research history appears here once you&apos;ve saved a recipe or a preference.</p>
        ) : (
          <ul className="card divide-y divide-cream-200">
            {history.map((h) => (
              <li key={h.id}>
                <button onClick={() => openHistory(h)} disabled={opening !== null} className="block w-full px-4 py-3 text-left hover:bg-cream-100">
                  <span className="block text-sm font-medium text-cocoa-800">{opening === h.id ? "Opening…" : h.title}</span>
                  <span className="block truncate text-xs text-cocoa-400">{h.query} · {new Date(h.createdAt).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
