# Multi-stage build for the Mineflayer MCP server.
#
# Note: this server speaks MCP over stdio, so it's normally spawned by an MCP
# client. A container is most useful for a headless, autonomous deployment with
# a configured default account (MCP_DEFAULT_* env vars) — it connects on start
# and is driven by a client that attaches to its stdio, or run for side effects.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# OCI / MCP-registry metadata.
LABEL org.opencontainers.image.source="https://github.com/G0Osey99/awesome-mineflayer-mcp" \
      org.opencontainers.image.description="MCP server for standalone-equivalent control of a Mineflayer Minecraft bot." \
      org.opencontainers.image.licenses="MIT" \
      io.modelcontextprotocol.server.name="io.github.g0osey99/awesome-mineflayer-mcp"

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Persist the config + Microsoft auth token cache across restarts by mounting a
# volume here (override with AWESOME_MINEFLAYER_MCP_HOME).
VOLUME ["/root/.awesome-mineflayer-mcp"]

ENTRYPOINT ["node", "dist/index.js"]
