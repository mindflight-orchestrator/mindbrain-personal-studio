# MindBrain Personal Studio

Local Svelte Studio for GhostCrab / MindBrain SQLite databases. It visualizes workspaces, ontologies, instance graphs, projections, and graph gap rules through the GhostCrab HTTP backend.

## Install From npm

After the package is published:

```bash
npm install @mindflight/mindbrain-personal-studio@0.6.0
npx mindbrain-studio
```

The package also exposes `ghostcrab-studio`:

```bash
npx -y --package=@mindflight/mindbrain-personal-studio@latest ghostcrab-studio
```

By default Studio looks for `~/.ghostcrab/databases/ghostcrab.sqlite`, matching GhostCrab's user-local SQLite default. Override it for one run:

```bash
npx -y --package=@mindflight/mindbrain-personal-studio@latest mindbrain-studio --sqlite /path/to/ghostcrab.sqlite
```

If the default GhostCrab SQLite does not exist and no explicit database is set, Studio starts against the packaged read-only demo fixture.

## Local Development

```bash
pnpm install
cp .env.example .env
pnpm studio
```

## Commands

| Command | Role |
|---------|------|
| `pnpm backend` | Start `ghostcrab-backend` for the SQLite in `.env`, `~/.ghostcrab`, or `--sqlite PATH` |
| `pnpm dev` | Start Vite wired to that backend, or to the demo fixture when no default GhostCrab DB exists |
| `pnpm studio` | `backend --detach` then `dev` in one terminal |
| `pnpm start` | Start the built Node server from `build/index.js` |
| `pnpm load:demo` | Load syndic demo bundle into workspace `immeuble-demo` |
| `pnpm dev:fixture` | Offline read-only graph fixture, no backend |
| `pnpm pack:local` | Build and create a local npm tarball in `dist-pack/` |

## Configuration

Studio reads `.env` from the package root and accepts the same GhostCrab variables used by `@mindflight/ghostcrab-personal-mcp`.

Most useful variables:

```env
GHOSTCRAB_SQLITE_PATH=~/.ghostcrab/databases/ghostcrab.sqlite
GHOSTCRAB_BACKEND_ADDR=:8091
GHOSTCRAB_MINDBRAIN_URL=http://127.0.0.1:8091
GHOSTCRAB_BACKEND_BIN=/absolute/path/to/ghostcrab-backend
GHOSTCRAB_ROOT=/absolute/path/to/ghostcrab-personal-mcp
GHOSTCRAB_HOME=~/.ghostcrab
GHOSTCRAB_DATA_DIR=~/.ghostcrab
GHOSTCRAB_CONFIG_DIR=~/.ghostcrab
```

Backend discovery order:

1. `GHOSTCRAB_BACKEND_BIN`
2. `GHOSTCRAB_ROOT`
3. local `node_modules/@mindflight/ghostcrab-personal-mcp*`
4. sibling checkout `../ghostcrab-personal-mcp`
5. `~/.ghostcrab/bin`

## Typical workflow

```bash
pnpm load:demo          # optional, adds immeuble-demo workspace
pnpm studio             # or: pnpm backend (T1) + pnpm dev (T2)
```

Select workspace **`immeuble-demo`**, ontology **`immeuble-demo::core`** after loading the demo.

The backend picks a free local port from 8092 when `GHOSTCRAB_BACKEND_ADDR` is not set and writes a sidecar under `data/runtime/`. If workspace pickers stay empty, verify `/api/brain/health` shows the expected SQLite path.

Optional: `pnpm seed:immeuble-projections` seeds projection rows for the Projections tab smoke test.

## Internal terms

Studio does not open your GhostCrab SQLite in normal use. A local **GhostCrab HTTP backend** (`ghostcrab-backend`) reads the file; Studio calls it via an internal proxy (`/api/brain/*`). The codebase calls this HTTP mode `DATA_SOURCE=brain`.

`sqlite-demo` is different: Studio opens the packaged fixture read-only for graph viewer smoke tests.

## Architecture

```text
Svelte UI -> /api/brain/* proxy -> ghostcrab-backend HTTP -> SQLite
```

Four tabs:

- **Modèle** — editable taxonomy trees, class/relation lists, optional schema graph
- **Données** — instance subgraph, search, docked projections drawer
- **Projections** — full catalog with auto-load and relevance
- **Rules** — graph gap rules, rule evaluation runs, invalid subjects, and dynamic graph focus

The **Rules** tab does not create persisted snapshots. It uses rule evaluation `subject_entity_id` values to focus the Données graph dynamically, like projection snapshot focus.

## Publication

This repository is prepared for manual npm publication under `@mindflight/mindbrain-personal-studio`.

```bash
pnpm install
pnpm check
pnpm build
pnpm pack:local
npm publish --access public
```

Release `0.6.0` should be tagged after the GitHub and GitLab repositories have the same squashed `main` commit.

## Fixture

`fixtures/minimal-graph.sqlite` is the packaged offline smoke-test database:

```bash
pnpm dev:fixture
```

For agent-assisted MCP switching, see [skills/ghostcrab-perso-sqlite-demo/SKILL.md](skills/ghostcrab-perso-sqlite-demo/SKILL.md).

## Plans

- Active release plan: [`docs/plan/2026-06-28-npm-studio-release-0.6.plan.md`](docs/plan/2026-06-28-npm-studio-release-0.6.plan.md)
- Dual-view MVP (archived): [`.cursor/dual-view_graph_explorer_33bd283d.plan.md`](.cursor/dual-view_graph_explorer_33bd283d.plan.md)
