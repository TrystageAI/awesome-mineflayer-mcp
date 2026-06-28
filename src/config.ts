/**
 * Central configuration for the Mineflayer MCP server.
 *
 * All values are read from environment variables once at startup so the
 * behaviour is deterministic for the life of the process. Defaults are tuned
 * for an LLM agent's limited context window.
 */

export const SERVER_NAME = "awesome-mineflayer-mcp";
export const SERVER_VERSION = "1.1.0";

function readInt(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Hard ceiling on the characters returned by any single tool call. */
export const CHARACTER_LIMIT = readInt("MCP_CHARACTER_LIMIT", 25_000);

/** Maximum number of game events retained in the in-memory ring buffer. */
export const EVENT_BUFFER_SIZE = readInt("MCP_EVENT_BUFFER", 1_000);

/** Minimum spacing between pushed resource-update / log notifications. */
export const PUSH_THROTTLE_MS = readInt("MCP_THROTTLE_MS", 250);

/** Radius (blocks) used to decide whether a proximity-filtered event is buffered. */
export const PROXIMITY_RADIUS = readInt("MCP_PROXIMITY_RADIUS", 32);

/** Default timeout (ms) applied to long-running actions when the caller omits one. */
export const DEFAULT_ACTION_TIMEOUT_MS = readInt("MCP_ACTION_TIMEOUT_MS", 60_000);

/**
 * Tool groups that can be toggled off via `MCP_DISABLE_GROUPS` (comma separated).
 * Group names match the `group` passed to each tool-registration module.
 */
const disabledGroups: ReadonlySet<string> = new Set(
  (process.env.MCP_DISABLE_GROUPS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0),
);

export function isGroupEnabled(group: string): boolean {
  return !disabledGroups.has(group.toLowerCase());
}

export function listDisabledGroups(): string[] {
  return [...disabledGroups];
}
