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
import { runSetup } from "./setup.js";
import { resolveDefaultConnect } from "./account-config.js";

async function main(): Promise<void> {
  // `awesome-mineflayer-mcp setup` runs the interactive account setup instead
  // of starting the MCP server.
  if (process.argv[2] === "setup") {
    await runSetup();
    return;
  }

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

  // Autonomous startup: if a default account is configured, connect it now so
  // the agent doesn't have to. Fire-and-forget — failures are logged to stderr
  // and the server stays usable (connect_bot / connect_default remain available).
  const def = resolveDefaultConnect();
  if (def.opts && def.autoConnect) {
    const who = `${def.account?.auth} ${def.account?.username}@${def.account?.host}`;
    process.stderr.write(`[${SERVER_NAME}] auto-connecting default account (${who})…\n`);
    void ctx.manager.connect(def.opts).then(
      () => process.stderr.write(`[${SERVER_NAME}] auto-connect: online\n`),
      (e: unknown) =>
        process.stderr.write(
          `[${SERVER_NAME}] auto-connect failed: ${String((e as Error)?.message ?? e)} — use connect_bot / connect_default\n`,
        ),
    );
  } else if (def.opts) {
    process.stderr.write(`[${SERVER_NAME}] default account configured (auto-connect off); call connect_default.\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`[${SERVER_NAME}] fatal: ${String((err as Error)?.stack ?? err)}\n`);
  process.exit(1);
});
