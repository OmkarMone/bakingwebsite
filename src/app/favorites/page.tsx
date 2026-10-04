import type { Metadata } from "next";
import { MyRecipes } from "@/components/MyRecipes";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "My Recipes" };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <PageHeader eyebrow="Your kitchen notebook" title="My Recipes" subtitle="Saved and favourite recipes, plus your recent research history." />
      <MyRecipes />
    </div>
  );
}
