# awesome-mineflayer-mcp

[![npm version](https://img.shields.io/npm/v/awesome-mineflayer-mcp.svg)](https://www.npmjs.com/package/awesome-mineflayer-mcp)
[![node](https://img.shields.io/node/v/awesome-mineflayer-mcp.svg)](https://nodejs.org)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A production-ready [Model Context Protocol](https://modelcontextprotocol.io) server that gives an LLM agent **standalone-equivalent control** over a [Mineflayer](https://github.com/PrismarineJS/mineflayer) Minecraft bot — movement, mining, crafting, inventory, combat, containers, chat, and much more — exposed as **112 strongly-typed tools** across 23 groups, with full bot lifecycle management and dual (poll + push) event streaming.

Backed by the Mineflayer ecosystem: `mineflayer-pathfinder` (A\* navigation), `mineflayer-pvp` (combat), `mineflayer-collectblock` (gathering), `mineflayer-tool` (auto tool-select), `mineflayer-auto-eat`, and `mineflayer-armor-manager`.

---

## Requirements

- **Node.js ≥ 20** (developed on 22.16)
- A Minecraft server to connect to (Java Edition). The bot auto-detects the server version.
- For online-mode servers: a Microsoft account (`auth: "microsoft"`).

## Installation

Run it on demand with **npx** (no install needed):

```bash
npx awesome-mineflayer-mcp
```

…or install it globally:

```bash
npm install -g awesome-mineflayer-mcp
awesome-mineflayer-mcp
```

The server speaks MCP over **stdio**, so it is normally launched by your MCP client rather than run by hand.

## Use with an MCP client

Add it to your client's MCP server configuration. The recommended form uses `npx` so you always get the latest published build:

**Claude Desktop** (`claude_desktop_config.json`), **Claude Code**, **Cursor**, or any stdio MCP client:

```json
{
  "mcpServers": {
    "mineflayer": {
      "command": "npx",
      "args": ["-y", "awesome-mineflayer-mcp"],
      "env": {
        "MCP_DISABLE_GROUPS": ""
      }
    }
  }
}
```

If you installed it globally, use `"command": "awesome-mineflayer-mcp"` with `"args": []` instead.

## Autonomous operation (default account)

For hands-off use, configure a **default account** so the bot connects automatically on startup — no `connect_bot` call required. Run the interactive setup:

```bash
npx awesome-mineflayer-mcp setup
```

It asks for the server host/port, an **offline** or **Microsoft** account, and whether to auto-connect on startup, then writes `~/.awesome-mineflayer-mcp/config.json` (**no password is stored**). For a Microsoft account it runs the device-code sign-in **once** and caches the token under `profilesFolder`, so later startups need no prompt.

On startup the server auto-connects the configured account (verify with `get_connection_status`). The agent can also call **`connect_default`** to (re)connect it or **`get_default_account`** to inspect it.

### Configure without the wizard (env vars)

You can set the default account entirely from your MCP client config — handy for headless deploys. Environment variables override the config file:

```json
{
  "mcpServers": {
    "mineflayer": {
      "command": "npx",
      "args": ["-y", "awesome-mineflayer-mcp"],
      "env": {
        "MCP_DEFAULT_HOST": "play.example.net",
        "MCP_DEFAULT_USERNAME": "MyBot",
        "MCP_DEFAULT_AUTH": "offline",
        "MCP_AUTO_CONNECT": "true"
      }
    }
  }
}
```

For Microsoft auth in a headless setup, run `setup` once locally first (or point `MCP_PROFILES_FOLDER` at a directory with a pre-cached token).

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `MCP_DISABLE_GROUPS` | _(none)_ | Comma-separated tool-group keys to disable (see catalog). Trim the surface for clients that struggle with a large tool list. |
| `MCP_CHARACTER_LIMIT` | `25000` | Max characters returned by any single tool call (truncated with a marker). |
| `MCP_EVENT_BUFFER` | `1000` | Size of the in-memory event ring buffer. |
| `MCP_THROTTLE_MS` | `250` | Minimum spacing between pushed resource-update / log notifications. |
| `MCP_PROXIMITY_RADIUS` | `32` | Radius (blocks) for proximity-filtered events (entity spawns, sounds). |
| `MCP_ACTION_TIMEOUT_MS` | `60000` | Default timeout for long actions when the caller omits one. |
| `MCP_DEFAULT_HOST` / `MCP_DEFAULT_PORT` | — | Default server to auto-connect on startup. |
| `MCP_DEFAULT_USERNAME` | — | Default account name (offline) or email (microsoft). |
| `MCP_DEFAULT_AUTH` | `offline` | Default auth mode: `offline` or `microsoft`. |
| `MCP_DEFAULT_VERSION` | auto | Force a protocol version for the default account. |
| `MCP_DEFAULT_AUTO_RECONNECT` | `true` | Auto-reconnect the default account on disconnect. |
| `MCP_AUTO_CONNECT` | `true`† | Auto-connect the default on startup († when a default is configured). |
| `MCP_PROFILES_FOLDER` | `<home>/profiles` | Microsoft auth token-cache directory. |
| `AWESOME_MINEFLAYER_MCP_HOME` | `~/.awesome-mineflayer-mcp` | Config + token-cache directory. |

Example — disable rarely-used groups:

```
MCP_DISABLE_GROUPS=creative,villager,enchanting,settings
```

## Quick start (tool flow)

1. **`connect_bot`** `{ host, username, auth }` — connect (resolves once the bot spawns). *Skip this if you configured a [default account](#autonomous-operation-default-account) — the bot auto-connects on startup; just check `get_connection_status`.*
2. Act: **`goto`**, **`dig`**, **`collect_block`**, **`craft_item`**, **`pvp_attack`**, **`chat`**, …
3. Observe: poll **`get_events`** (pass the returned `nextSince` each time) and **`get_state`**; or subscribe to the `bot://*` resources.
4. **`disconnect_bot`** when done.

Block / item / entity arguments accept **human names** (`"iron_ore"`, `"diamond_pickaxe"`, `"zombie"`); unknown names return fuzzy suggestions.

## Authentication

- `auth: "offline"` (default) — offline-mode servers; `username` is the in-game name.
- `auth: "microsoft"` — `username` is the account email. A device-code prompt is emitted as an `msa_code` event / log notification. Set **`profilesFolder`** to cache the token so subsequent runs skip the prompt, or pass a cached `accessToken`. **Tip:** run `npx awesome-mineflayer-mcp setup` once to do the device-code sign-in and cache the token, then the server connects autonomously (see [Autonomous operation](#autonomous-operation-default-account)).

---

## Tool catalog (112 tools, 23 groups)

Group keys (for `MCP_DISABLE_GROUPS`) are shown in brackets.

- **Lifecycle** `[lifecycle]` — `connect_bot`, `connect_default`, `disconnect_bot`, `reconnect_bot`, `respawn`, `get_connection_status`, `get_default_account`
- **State & inspection** `[state]` (read-only) — `get_state`, `get_inventory`, `list_players`, `list_entities`, `find_nearest_entity`, `get_entity_details`, `get_scoreboards`, `get_teams`, `get_boss_bars`, `get_control_states`, `get_chat_patterns`, `support_feature`, `pathfinder_status`, `get_settings`, `get_physics`, `get_loaded_plugins`
- **World queries** `[world]` (read-only) — `get_block_at`, `find_blocks`, `get_cursor_target`, `get_blocks_in_region`, `wait_for_chunks_to_load`
- **Movement & pathfinding** `[movement]` — `goto`, `set_goal`, `flee_from`, `follow_entity`, `stop_pathfinding`, `get_path_to`, `configure_movements`, `configure_pathfinder`, `set_control_state`, `clear_control_states`, `elytra_fly`, `wait_for_ticks`, `set_physics_enabled`
- **Look** `[look]` — `look_at`, `look`, `look_at_entity`
- **Digging & building** `[digging]` — `dig`, `place_block`, `activate_block`, `activate_entity`, `swing_arm`
- **Combat** `[combat]` — `pvp_attack`, `attack_entity`, `pvp_stop`, `pvp_configure`
- **Inventory & items** `[inventory]` — `equip_item`, `unequip_item`, `toss_item`, `set_quickbar_slot`, `consume`, `activate_item`, `click_window`, `move_slot_item`, `transfer_items`
- **Containers** `[containers]` — `open_container`, `read_open_container`, `container_deposit`, `container_withdraw`, `close_window`
- **Furnace / smelting** `[furnace]` — `open_furnace`, `furnace_action`, `furnace_status`, `smelt_item`
- **Enchanting & anvil** `[enchanting]` — `enchant_item`, `anvil_combine`
- **Villager trading** `[villager]` — `open_villager`, `trade_with_villager`
- **Crafting** `[crafting]` — `list_recipes`, `craft_item`
- **Block gathering** `[gathering]` — `collect_block`, `cancel_collect`, `set_collect_config`
- **Tool auto-select** `[tool]` — `equip_tool_for_block`, `set_tool_chest_locations`, `get_best_tool`
- **Survival automation** `[survival]` — `autoeat_set_enabled`, `autoeat_configure`, `autoeat_eat`, `autoeat_cancel`, `autoeat_preview`, `armor_equip_all`
- **Beds & sleep** `[beds]` — `sleep`, `wake`
- **Vehicles** `[vehicles]` — `mount_entity`, `dismount`, `steer_vehicle`
- **Fishing, books & signs** `[fishing]` — `fish`, `cancel_fish`, `write_book`, `update_sign`
- **Chat & communication** `[chat]` — `chat`, `whisper`, `run_command`, `tab_complete`, `register_chat_pattern`, `remove_chat_pattern`, `wait_for_message`
- **Settings** `[settings]` — `set_settings`
- **Creative mode** `[creative]` — `creative_set_inventory_slot`, `creative_clear_inventory`, `creative_fly`, `creative_fly_to`
- **Events & telemetry** `[events]` — `get_events`, `cancel_task`

Long-running actions (`goto`, `dig`, `collect_block`, `pvp_attack`, `fish`, `smelt_item`, `craft_item`) are mutually exclusive and cancellable — start a new movement/combat action to supersede the prior one, or call `stop_pathfinding` / `pvp_stop` / `cancel_collect` / `cancel_fish` / `cancel_task`.

## Resources

Subscribe-capable JSON resources for clients that support resource subscriptions:

- `bot://state` — live self snapshot (position, vitals, gamemode, time, weather, held item, control states)
- `bot://inventory` — items, armor, off-hand, held slot
- `world://entities` — up to 50 nearest tracked entities
- `world://players` — server roster
- `bot://events` — tail of recent events

## Events

Game events are delivered two ways:

- **Pull:** `get_events({ since, types, limit })` drains a ring buffer; pass the returned `nextSince` to read only new events. `dropped: true` signals the buffer overflowed since your `since`.
- **Push:** subscribed resources emit throttled `notifications/resources/updated`; notable lines (chat, death, kick, error, msa_code) are forwarded via `sendLoggingMessage`.

High-frequency observations (movement, per-tick updates, block/entity updates, time) are intentionally **not** buffered — read them on demand via `get_state` and the read-only tools.

## Development (from source)

```bash
git clone https://github.com/G0Osey99/awesome-mineflayer-mcp.git
cd awesome-mineflayer-mcp
npm install
npm run build       # tsc -> dist/
npm run typecheck   # tsc --noEmit
npm test            # vitest (unit tests for the pure logic)
npm run dev         # tsx src/index.ts (run from source, no build step)
```

Architecture and the full design rationale: [`docs/superpowers/specs/2026-06-28-mineflayer-mcp-server-design.md`](docs/superpowers/specs/2026-06-28-mineflayer-mcp-server-design.md).

```
src/
  index.ts        entry (stdio transport, graceful shutdown)
  server.ts       builds the McpServer, registers tool groups + resources
  config.ts       env + constants
  bot/            manager (lifecycle FSM), plugins, events, wire-events, state, windows, action-locks
  tools/          one module per tool group (+ registry.ts)
  resources/      MCP resources + push notifications
  util/           errors, format, result, resolve (name→id + fuzzy), serialize
  schemas/        shared Zod fragments
```

## Publishing (maintainers)

```bash
npm version patch        # or minor / major — bumps package.json + tags
npm publish              # the `prepare` script builds dist/ first; publishes to npm
git push --follow-tags
```

The published package ships only `dist/`, `README.md`, and `LICENSE` (see the `files` field).

## Limitations

- **One bot per server process** (single-session by design).
- **Evaluations require a seeded world.** A live Minecraft world is not deterministic, so the evaluation set in `eval/` targets a documented seeded fixture (see `eval/fixture.md`); it cannot be verified against an arbitrary live server.
- `cancel_fish` is best-effort (Mineflayer exposes no first-class fishing abort).
- Microsoft auth's first run needs an interactive device code (surfaced as an `msa_code` event); use `profilesFolder` to cache it.

## License

MIT
