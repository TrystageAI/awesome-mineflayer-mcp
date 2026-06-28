/** Output formatting + truncation helpers shared by every tool. */

import { CHARACTER_LIMIT } from "../config.js";

/** Clamp text to the character limit with a clear, actionable marker. */
export function truncate(text: string, limit = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  const omitted = text.length - limit;
  return (
    text.slice(0, limit) +
    `\n…[truncated ${omitted} of ${text.length} characters — narrow your query, lower a count/limit, or use format:"concise"]`
  );
}

/** Round to a fixed number of decimal places (entity positions are fractional). */
export function round(n: number, dp = 2): number {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Stringify arbitrary tool output for the text content block. */
export function toStringText(data: unknown): string {
  if (data === undefined) return "ok";
  if (typeof data === "string") return data;
  return JSON.stringify(data, jsonReplacer, 2);
}

/** Drop undefined/function/circular noise that occasionally leaks from game objects. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "function") return undefined;
  if (typeof value === "bigint") return value.toString();
  return value;
}
