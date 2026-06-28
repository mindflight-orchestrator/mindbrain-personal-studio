---
name: ghostcrab-perso-sqlite-demo
description: Use when an agent needs to point GhostCrab PERSO MCP or the SQLite Sigma viewer at a demo mindBrain SQLite database, either by changing an existing MCP config or by adding a separate demo MCP entry for Cursor, Claude, Codex, or similar MCP clients.
---

# GhostCrab PERSO SQLite Demo Switching

Use this skill when a user has a local GhostCrab PERSO SQLite MCP setup and wants to test a downloaded demo repository that contains a preloaded mindBrain SQLite database.

## Goal

Prefer not to break the user's personal GhostCrab PERSO database. For demos, create a separate MCP entry when possible. Only modify an existing MCP entry when the user explicitly asks to repoint that entry.

## Inputs To Discover

1. Demo SQLite path:
   - Prefer an explicit user path.
   - Otherwise search the current repo for likely files:
     - `data/ghostcrab.sqlite`
     - `data/*.sqlite`
     - `fixtures/*.sqlite`
2. MCP launcher command:
   - Reuse the command and args from the user's existing GhostCrab PERSO MCP entry.
   - Common command shape is `node` plus a `gcp.mjs` path plus args such as `brain up`.
3. MCP client config file:
   - Codex: `~/.codex/config.toml`
   - Cursor: `~/.cursor/mcp.json`
   - Claude Desktop on macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Other clients: inspect their MCP docs or existing config.

## Environment Contract

Use these env vars to select the SQLite DB:

```text
GHOSTCRAB_DATABASE_KIND=sqlite
GHOSTCRAB_EMBEDDINGS_MODE=disabled
GHOSTCRAB_PERSO_SQLITE_PATH=/absolute/path/to/demo.sqlite
```

If the MCP server package expects a different SQLite env var, keep the same value and also set:

```text
MCP_GHOSTCRAB_SQLITE_PATH=/absolute/path/to/demo.sqlite
GHOSTCRAB_SQLITE_PATH=/absolute/path/to/demo.sqlite
```

The Sigma viewer accepts `GHOSTCRAB_SQLITE_PATH`; in `auto` mode it also checks `GHOSTCRAB_PERSO_SQLITE_PATH` and `MCP_GHOSTCRAB_SQLITE_PATH`.

## Recommended: Add A Demo MCP Entry

Copy the existing GhostCrab PERSO entry and rename it, for example:

- `ghostcrab_perso_demo` in Codex TOML
- `ghostcrab perso demo` in Cursor or Claude JSON

Keep the same command and args. Change only the environment by adding the absolute demo DB path.

### Codex TOML Pattern

```toml
[mcp_servers.ghostcrab_perso_demo]
command = "node"
args = [
  "/absolute/path/to/gcp.mjs",
  "brain",
  "up"
]
env = {
  GHOSTCRAB_DATABASE_KIND = "sqlite",
  GHOSTCRAB_EMBEDDINGS_MODE = "disabled",
  GHOSTCRAB_PERSO_SQLITE_PATH = "/absolute/path/to/demo.sqlite",
  MCP_GHOSTCRAB_SQLITE_PATH = "/absolute/path/to/demo.sqlite"
}
```

### Cursor / Claude JSON Pattern

```json
{
  "mcpServers": {
    "ghostcrab perso demo": {
      "command": "node",
      "args": ["/absolute/path/to/gcp.mjs", "brain", "up"],
      "env": {
        "GHOSTCRAB_DATABASE_KIND": "sqlite",
        "GHOSTCRAB_EMBEDDINGS_MODE": "disabled",
        "GHOSTCRAB_PERSO_SQLITE_PATH": "/absolute/path/to/demo.sqlite",
        "MCP_GHOSTCRAB_SQLITE_PATH": "/absolute/path/to/demo.sqlite"
      }
    }
  }
}
```

## Alternative: Repoint Existing Entry

Only do this when the user asks to replace the active personal MCP database.

1. Backup the config file first.
2. Find the GhostCrab PERSO MCP entry.
3. Add or update `GHOSTCRAB_PERSO_SQLITE_PATH`, `MCP_GHOSTCRAB_SQLITE_PATH`, and, when useful for the viewer, `GHOSTCRAB_SQLITE_PATH`.
4. Preserve unrelated env vars, command, args, and labels.

## Viewer Demo Run

For this repo:

```bash
GHOSTCRAB_SQLITE_PATH=/absolute/path/to/demo.sqlite pnpm dev
```

For the bundled tiny fixture:

```bash
pnpm dev:fixture
```

## Validation

After editing config or setting env:

1. Confirm the SQLite file exists.
2. Confirm it has `graph_entity`, `graph_relation`, `facets`, and `workspaces` tables.
3. Start or restart the MCP client.
4. In the viewer, call `/api/graph/ontologies` and verify workspaces/entity types are listed.
5. Avoid writing to the SQLite file unless the user explicitly asked for a mutable demo.
