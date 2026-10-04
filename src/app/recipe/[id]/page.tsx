import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ResearchResult } from "@/lib/types";
import { getDb } from "@/lib/server/db";
import { currentProfileId } from "@/lib/server/session";
import { RecipeResult } from "@/components/RecipeResult";

export const metadata: Metadata = { title: "Saved recipe" };

/** A saved recipe — visible only to the profile that saved it. */
export default async function SavedRecipePage({ params }: PageProps<"/recipe/[id]">) {
  const { id } = await params;
  const db = getDb();
  const profileId = await currentProfileId();
  if (!db || !profileId) notFound();
  const row = await db.savedRecipe.findFirst({ where: { id, profileId } });
  if (!row) notFound();
  const result = { ...(row.data as unknown as ResearchResult), cached: true };
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <RecipeResult result={result} mode="saved" saved={{ id: row.id, favorite: row.favorite, shareId: row.shareId }} />
    </div>
  );
}
