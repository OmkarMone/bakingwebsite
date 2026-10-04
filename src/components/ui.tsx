import type { ReactNode } from "react";

/** Small shared presentational primitives. Server- and client-safe (no hooks). */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionHeading({
  icon,
  title,
  subtitle,
  action,
  id,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="mb-4 flex scroll-mt-24 flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-caramel-100 text-caramel-600">
            {icon}
          </span>
        )}
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-cocoa-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-cream-200 text-cocoa-600",
  good: "bg-pistachio-100 text-pistachio-700",
  warn: "bg-caramel-100 text-caramel-600",
  bad: "bg-berry-100 text-berry-600",
  dark: "bg-cocoa-700 text-cream-50",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-cocoa-400">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-cocoa-800">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-cocoa-400">{hint}</div>}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "error" | "success";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-cream-300 bg-cream-50 text-cocoa-600",
    warn: "border-caramel-300 bg-caramel-100/60 text-cocoa-700",
    error: "border-berry-400/50 bg-berry-50 text-berry-600",
    success: "border-pistachio-500/40 bg-pistachio-50 text-pistachio-700",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`} role={tone === "error" ? "alert" : undefined}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-berry-500">{eyebrow}</p>}
      <h1 className="text-3xl font-semibold tracking-tight text-cocoa-800 sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm text-cocoa-500 sm:text-base">{subtitle}</p>}
    </div>
  );
}
