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
  title: { default: "CakeRecipe Finder — curated cake recipes", template: "%s · CakeRecipe Finder" },
  description:
    "Tell us the cake you want to bake. Get a curated recipe cross-checked against reputable baking sites, scaled to your requirements — with sources, substitutions and where to buy ingredients.",
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
              CakeRecipe Finder recipes are written for our library and cross-checked against published recipes — every
              reference is linked. Please credit and visit the original authors.
            </p>
            <p>Store availability and prices are never guessed.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
