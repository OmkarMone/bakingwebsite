import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "CakeRecipe Finder — research-backed cake recipes", template: "%s · CakeRecipe Finder" },
  description:
    "Tell us the cake you want to bake. We research and compare recipes from reputable baking sites, then build a reliable recipe for your exact requirements — with sources, scaling, substitutions and where to buy ingredients.",
};

export const viewport: Viewport = {
  themeColor: "#fbf6ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="no-print mt-16 border-t border-cream-200 bg-cream-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-cocoa-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              CakeRecipe Finder compares published recipes and links every source. Recipes we generate are syntheses —
              always credit and visit the original authors.
            </p>
            <p>Store availability and prices are never guessed.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
