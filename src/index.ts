#!/usr/bin/env node
/**
 * Entry point. Builds the server and serves it over stdio.
 *
 * IMPORTANT: stdout is the MCP protocol channel — all human/debug logging must
 * go to stderr, never stdout.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";
import { SERVER_NAME, SERVER_VERSION, listDisabledGroups } from "./config.js";

async function main(): Promise<void> {
  const { server, ctx } = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`[${SERVER_NAME}] received ${signal}, shutting down…\n`);
    try {
      ctx.manager.shutdown();
    } catch {
      /* ignore */
    }
    // Give the quit packet a moment, then exit.
    setTimeout(() => process.exit(0), 250);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const disabled = listDisabledGroups();
  process.stderr.write(
    `[${SERVER_NAME}] v${SERVER_VERSION} ready on stdio` +
      (disabled.length ? ` (disabled groups: ${disabled.join(", ")})` : "") +
      "\n",
  );
}

main().catch((err) => {
  process.stderr.write(`[${SERVER_NAME}] fatal: ${String((err as Error)?.stack ?? err)}\n`);
  process.exit(1);
});
