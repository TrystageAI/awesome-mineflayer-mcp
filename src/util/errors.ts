/**
 * Typed, agent-friendly error handling.
 *
 * Tools never throw raw errors back to the MCP client. Instead every handler is
 * wrapped (see `util/result.ts`) so that thrown `ToolError`s — and any unexpected
 * exception — are converted into an `isError` result whose text carries a stable
 * machine code plus natural-language guidance the agent can act on.
 */

export type ErrorCode =
  | "NOT_CONNECTED" // no bot session is online
  | "ALREADY_CONNECTED" // a bot is already connected
  | "INVALID_ARGS" // arguments failed a semantic (not schema) check
  | "UNKNOWN_NAME" // a block/item/entity name could not be resolved
  | "NOT_FOUND" // a referenced block/entity/recipe does not exist in the world
  | "NO_PATH" // pathfinder could not reach the goal
  | "TIMEOUT" // an action exceeded its timeout
  | "GOAL_CHANGED" // navigation goal was superseded
  | "CANCELLED" // action was cancelled by the caller / a newer action
  | "BUSY" // another exclusive action is in progress
  | "MISSING_TOOL" // no suitable tool to dig/harvest
  | "MISSING_ITEM" // a required item is not in inventory
  | "MISSING_MATERIALS" // not enough materials for a recipe
  | "INVENTORY_FULL_NO_CHEST" // collect filled inventory with nowhere to deposit
  | "DIGGING_ABORTED" // dig was interrupted before completion
  | "NO_WINDOW" // no container/window is currently open
  | "PLUGIN_MISSING" // a required mineflayer plugin is not loaded
  | "UNSUPPORTED" // the action is not supported on this server/version/gamemode
  | "INTERNAL"; // an unexpected error

/** An error with a stable code and optional remediation suggestions. */
export class ToolError extends Error {
  readonly code: ErrorCode;
  readonly suggestions?: string[];

  constructor(code: ErrorCode, message: string, suggestions?: string[]) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.suggestions = suggestions;
  }
}

/** Convenience constructors for the most common cases. */
export const errors = {
  notConnected: () =>
    new ToolError(
      "NOT_CONNECTED",
      "No bot is connected. Call `connect_bot` first.",
    ),
  pluginMissing: (plugin: string) =>
    new ToolError(
      "PLUGIN_MISSING",
      `The "${plugin}" plugin is not loaded, so this tool is unavailable.`,
    ),
  noWindow: () =>
    new ToolError(
      "NO_WINDOW",
      "No container/window is open. Open one first (e.g. `open_container`, `open_furnace`).",
    ),
  unknownName: (kind: string, query: string, suggestions: string[]) =>
    new ToolError(
      "UNKNOWN_NAME",
      `Unknown ${kind} "${query}".` +
        (suggestions.length ? ` Did you mean: ${suggestions.join(", ")}?` : ""),
      suggestions,
    ),
};

/** Normalise any thrown value into a `{ code, message, suggestions }` shape. */
export function toToolError(e: unknown): {
  code: ErrorCode;
  message: string;
  suggestions?: string[];
} {
  if (e instanceof ToolError) {
    return { code: e.code, message: e.message, suggestions: e.suggestions };
  }
  if (e instanceof Error) {
    return { code: "INTERNAL", message: e.message };
  }
  return { code: "INTERNAL", message: String(e) };
}
