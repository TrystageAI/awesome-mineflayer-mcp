/** Builders that turn handler return values / errors into MCP tool results. */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toToolError } from "./errors.js";
import { toStringText, truncate } from "./format.js";

/** Wrap a successful handler value (string or JSON-serialisable object). */
export function dataResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: truncate(toStringText(data)) }] };
}

/** Wrap a thrown error into an `isError` result with a stable code + guidance. */
export function errorResult(e: unknown): CallToolResult {
  const { code, message, suggestions } = toToolError(e);
  let text = `Error [${code}]: ${message}`;
  if (suggestions && suggestions.length > 0) {
    text += `\nSuggestions: ${suggestions.join(", ")}`;
  }
  return { content: [{ type: "text", text }], isError: true };
}
