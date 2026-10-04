import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ResearchResult } from "@/lib/types";
import { getDb } from "@/lib/server/db";
import { RecipeResult } from "@/components/RecipeResult";

async function load(shareId: string) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(shareId)) return null;
  const db = getDb();
  if (!db) return null;
  return db.savedRecipe.findUnique({ where: { shareId } });
}

export async function generateMetadata({ params }: PageProps<"/r/[shareId]">): Promise<Metadata> {
  const row = await load((await params).shareId);
  return { title: row?.title ?? "Shared recipe", robots: { index: false } };
}

/** Public, read-only view of a recipe the owner chose to share. */
export default async function SharedRecipePage({ params }: PageProps<"/r/[shareId]">) {
  const row = await load((await params).shareId);
  if (!row) notFound();
  const result = { ...(row.data as unknown as ResearchResult), cached: true };
  // Never expose the owner's location in a public link
  result.requirements = { ...result.requirements, location: null };
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <RecipeResult result={result} mode="shared" />
    </div>
  );
}
