"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Download, Heart, Loader2, Printer, Share2 } from "lucide-react";
import type { RecipeIngredient, ResearchResult } from "@/lib/types";
import { api } from "@/lib/client/api";
import { downloadText, recipeToMarkdown, slugify } from "@/lib/recipeExport";

/**
 * Save / favourite / share / download / print.
 * `savedId` is set when viewing an already-saved recipe.
 */
export function RecipeActions({
  result,
  ingredients,
  savedId: initialSavedId = null,
  initialFavorite = false,
  initialShareId = null,
}: {
  result: ResearchResult;
  ingredients: RecipeIngredient[];
  savedId?: string | null;
  initialFavorite?: boolean;
  initialShareId?: string | null;
}) {
  const [savedId, setSavedId] = useState<string | null>(initialSavedId);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [shareId, setShareId] = useState<string | null>(initialShareId);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const flash = (tone: "ok" | "err", text: string) => {
    setMessage({ tone, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const save = async (fav = false): Promise<string | null> => {
    if (savedId) return savedId;
    setBusy("save");
    try {
      const r = await api<{ id: string; alreadySaved?: boolean }>("/api/recipes", { method: "POST", json: { researchId: result.id, favorite: fav } });
      setSavedId(r.id);
      if (fav) setFavorite(true);
      flash("ok", r.alreadySaved ? "Already in My Recipes" : "Saved to My Recipes");
      return r.id;
    } catch (e) {
      flash("err", (e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const toggleFavorite = async () => {
    if (!savedId) {
      await save(true);
      return;
    }
    setBusy("fav");
    try {
      const r = await api<{ favorite: boolean }>(`/api/recipes/${savedId}`, { method: "PATCH", json: { favorite: !favorite } });
      setFavorite(r.favorite);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      const id = savedId ?? (await save());
      if (!id) return;
      let sid = shareId;
      if (!sid) {
        const r = await api<{ shareId: string }>(`/api/recipes/${id}`, { method: "PATCH", json: { share: true } });
        sid = r.shareId;
        setShareId(sid);
      }
      const url = `${window.location.origin}/r/${sid}`;
      if (navigator.share) {
        await navigator.share({ title: result.recipe.name, text: result.recipe.summary, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        flash("ok", "Share link copied to clipboard");
      }
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="no-print">
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => save()} disabled={busy !== null || !!savedId}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : savedId ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {savedId ? "Saved" : "Save recipe"}
        </button>
        <button className="btn-ghost" onClick={toggleFavorite} disabled={busy !== null} aria-pressed={favorite}>
          <Heart className={`h-4 w-4 ${favorite ? "fill-berry-500 text-berry-500" : ""}`} /> {favorite ? "Favorited" : "Favorite"}
        </button>
        <button className="btn-ghost" onClick={share} disabled={busy !== null}>
          {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Share
        </button>
        <button className="btn-ghost" onClick={() => downloadText(`${slugify(result.recipe.name)}.md`, recipeToMarkdown(result, ingredients))}>
          <Download className="h-4 w-4" /> Download
        </button>
        <button className="btn-ghost" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${message.tone === "ok" ? "text-pistachio-700" : "text-berry-600"}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
