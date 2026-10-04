import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { env } from "./env";
import { rateLimit, type LIMITS } from "./rateLimit";
import { DatabaseUnavailableError } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}

/** Reject cross-origin state-changing requests. We never emit CORS headers (no wildcard). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin fetches from older browsers / server-to-server
  const self = new URL(req.url).origin;
  if (origin === self) return;
  if (env.allowedOrigins().includes(origin.replace(/\/$/, ""))) return;
  throw new HttpError(403, "Cross-origin request blocked", "forbidden_origin");
}

export function enforceRateLimit(req: Request, bucket: keyof typeof LIMITS) {
  const r = rateLimit(clientKey(req), bucket);
  if (!r.ok) {
    throw new HttpError(
      429,
      `Too many requests — please wait about ${Math.max(1, Math.round(r.retryAfterSec / 60))} minute(s) and try again.`,
      "rate_limited",
      { "Retry-After": String(r.retryAfterSec) },
    );
  }
}

export async function parseJson<T>(req: Request, schema: ZodType<T>, maxBytes = 32_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request too large", "too_large");
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "Invalid JSON body", "bad_json");
  }
  return schema.parse(raw);
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status, headers: err.headers });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", code: "invalid_input" },
      { status: 400 },
    );
  }
  if (err instanceof DatabaseUnavailableError) {
    return NextResponse.json({ error: err.message, code: "no_database" }, { status: 503 });
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
}

/** Wrap a route handler with consistent error handling. */
export function handler<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
