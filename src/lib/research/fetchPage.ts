import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import robotsParser from "robots-parser";
import { USER_AGENT } from "@/lib/server/env";
import { sharedCache } from "@/lib/server/memoryCache";

/**
 * Polite, safe page fetching:
 *  - respects robots.txt for our user agent
 *  - http(s) only, public IPs only (SSRF protection), manual redirect validation
 *  - size + time limits
 */

const MAX_BYTES = 2_500_000;
const TIMEOUT_MS = 10_000;
const BOT_NAME = "CakeRecipeFinder";

export class FetchBlockedError extends Error {
  constructor(
    public reason: "robots" | "unsafe_url" | "http" | "not_html" | "too_large" | "timeout" | "network",
    message: string,
  ) {
    super(message);
  }
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchBlockedError("unsafe_url", "Invalid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchBlockedError("unsafe_url", "Unsupported protocol");
  if (url.username || url.password) throw new FetchBlockedError("unsafe_url", "Credentials in URL");
  if (url.port && !["80", "443"].includes(url.port)) throw new FetchBlockedError("unsafe_url", "Non-standard port");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal"))
    throw new FetchBlockedError("unsafe_url", "Private host");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new FetchBlockedError("network", "DNS lookup failed");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new FetchBlockedError("unsafe_url", "Resolves to a private address");
  return url;
}

async function rawFetch(url: string, accept: string): Promise<Response> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicUrl(current);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT(), Accept: accept, "Accept-Language": "en;q=0.9" },
        cache: "no-store",
      });
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      throw new FetchBlockedError(timeout ? "timeout" : "network", timeout ? "Timed out" : "Network error");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    return res;
  }
  throw new FetchBlockedError("http", "Too many redirects");
}

async function readCapped(res: Response): Promise<string> {
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new FetchBlockedError("too_large", "Page too large");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break; // JSON-LD is almost always in <head>; a truncated page is still useful
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

type Robots = ReturnType<typeof robotsParser>;
const robotsCache = sharedCache<Robots | "allow-all">("robots", 500);

export async function isAllowedByRobots(url: string): Promise<boolean> {
  const u = new URL(url);
  const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
  let robots = robotsCache.get(robotsUrl);
  if (!robots) {
    try {
      const res = await rawFetch(robotsUrl, "text/plain");
      if (res.status >= 400 && res.status < 500) {
        robots = "allow-all"; // no robots.txt → allowed (RFC 9309)
      } else if (!res.ok) {
        // 5xx: RFC 9309 says assume complete disallow
        robotsCache.set(robotsUrl, robotsParser(robotsUrl, "User-agent: *\nDisallow: /"), 60 * 60_000);
        return false;
      } else {
        robots = robotsParser(robotsUrl, (await readCapped(res)).slice(0, 500_000));
      }
    } catch {
      robots = "allow-all";
    }
    robotsCache.set(robotsUrl, robots, 24 * 60 * 60_000);
  }
  if (robots === "allow-all") return true;
  return robots.isAllowed(url, BOT_NAME) !== false;
}

export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  if (!(await isAllowedByRobots(url))) throw new FetchBlockedError("robots", "Disallowed by robots.txt");
  const res = await rawFetch(url, "text/html,application/xhtml+xml");
  if (!res.ok) throw new FetchBlockedError("http", `HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (type && !type.includes("html")) throw new FetchBlockedError("not_html", `Not HTML (${type})`);
  return { html: await readCapped(res), finalUrl: res.url || url };
}
