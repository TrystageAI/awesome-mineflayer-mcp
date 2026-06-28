/**
 * Uniform tool registration.
 *
 * Each tool module exports a `register*(reg, ctx)` function that calls `reg(def)`.
 * The registrar:
 *  - skips tools whose group is disabled via MCP_DISABLE_GROUPS,
 *  - passes the (raw Zod shape) inputSchema straight to SDK 1.29's registerTool,
 *  - wraps the handler so its return value becomes a text result and any thrown
 *    error becomes a stable, isError result with guidance.
 */

import type { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { isGroupEnabled } from "../config.js";
import { dataResult, errorResult } from "../util/result.js";
import type { ToolContext } from "../context.js";

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDef<S extends z.ZodRawShape> {
  /** Unique tool name (snake_case). */
  name: string;
  /** Group key for MCP_DISABLE_GROUPS gating. */
  group: string;
  description: string;
  inputSchema?: S;
  annotations?: ToolAnnotations;
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<unknown> | unknown;
}

export type Registrar = <S extends z.ZodRawShape>(def: ToolDef<S>) => void;

export function makeRegistrar(ctx: ToolContext): Registrar {
  return function register<S extends z.ZodRawShape>(def: ToolDef<S>): void {
    if (!isGroupEnabled(def.group)) return;

    const config: Record<string, unknown> = { description: def.description };
    if (def.inputSchema) config.inputSchema = def.inputSchema;
    if (def.annotations) config.annotations = def.annotations;

    const callback = async (args: unknown): Promise<CallToolResult> => {
      try {
        const data = await def.handler((args ?? {}) as z.infer<z.ZodObject<S>>, ctx);
        return dataResult(data);
      } catch (e) {
        return errorResult(e);
      }
    };

    // SDK 1.29's overloaded signature is hard to satisfy generically; the casts
    // are confined to this single well-tested call site.
    (ctx.server.registerTool as unknown as (n: string, c: unknown, cb: unknown) => void)(
      def.name,
      config,
      callback,
    );
  };
}
