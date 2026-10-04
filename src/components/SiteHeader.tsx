"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CakeSlice, Menu, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Find a recipe" },
  { href: "/calculator", label: "Calculators" },
  { href: "/troubleshooting", label: "Troubleshooting" },
  { href: "/favorites", label: "My Recipes" },
  { href: "/preferences", label: "Preferences" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-cream-200/80 bg-cream-100/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-cocoa-700 text-cream-50 shadow-card">
            <CakeSlice className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight text-cocoa-800">
            CakeRecipe <span className="text-berry-500">Finder</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                isActive(n.href) ? "bg-cocoa-700 text-cream-50" : "text-cocoa-600 hover:bg-cream-200"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          className="btn-ghost px-3 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-cream-200 bg-cream-50 px-4 py-2 md:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive(n.href) ? "bg-cocoa-700 text-cream-50" : "text-cocoa-700"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
