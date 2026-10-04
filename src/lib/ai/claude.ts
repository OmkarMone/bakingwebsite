import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/server/env";

export class AiConfigError extends Error {}

let client: Anthropic | null = null;

/** Server-side Anthropic client. The key never leaves the server. */
export function anthropicClient(): Anthropic {
  const apiKey = env.anthropicKey();
  if (!apiKey) throw new AiConfigError("ANTHROPIC_API_KEY is not configured — recipe synthesis is unavailable.");
  client ??= new Anthropic({ apiKey, maxRetries: 2, timeout: 5 * 60_000 });
  return client;
}

export const aiAvailable = () => Boolean(env.anthropicKey());

/** Concatenate text blocks of a message. */
export function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Escape text placed inside our XML-ish data delimiters so third-party content
 * cannot close the tag and smuggle "instructions" outside the untrusted block.
 */
export function escapeForPrompt(s: string): string {
  return s.replace(/</g, "‹").replace(/>/g, "›");
}
