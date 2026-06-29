# Prepare Studio NPM Package And Release 0.6

## Summary

- Prepare the Studio repo for manual npm publication, but do not run `npm publish`.
- Publishable package target: `@mindflight/mindbrain-personal-studio@0.6.0`.
- Include the package prep, README update, saved plan, and squash-release flow in the final `0.6` tag.
- Preserve unrelated local demo work outside the release.

## Key Changes

- Update package metadata for publication: public npm scope, repository metadata, package files, Node engine, and `mindbrain-studio` / `ghostcrab-studio` bins.
- Add a production Studio start path using SvelteKit `adapter-node`, with a bin script that starts the built server instead of Vite dev.
- Keep GhostCrab independent: no direct or peer dependency on `@mindflight/ghostcrab-personal-mcp`.
- Resolve GhostCrab config through `.env`, `GHOSTCRAB_SQLITE_PATH`, `GHOSTCRAB_BACKEND_ADDR`, `GHOSTCRAB_MINDBRAIN_URL`, `GHOSTCRAB_HOME`, `GHOSTCRAB_DATA_DIR`, `GHOSTCRAB_CONFIG_DIR`, `GHOSTCRAB_ROOT`, and `GHOSTCRAB_BACKEND_BIN`.
- Backend discovery order: explicit env, local/global GhostCrab package paths, sibling checkout, then `~/.ghostcrab/bin`.
- Default SQLite: `~/.ghostcrab/databases/ghostcrab.sqlite`; if absent and no explicit DB was requested, fall back to packaged `fixtures/minimal-graph.sqlite` in `sqlite-demo` mode.
- Update README with npm install/start docs, pnpm packaging commands, env contract, default SQLite behavior, demo fallback, and manual publish instructions.

## Release Flow

- Keep existing local docs/scripts work out of the release by stashing it before edits and restoring it after push.
- Rename current GitLab `origin` to `origin2`, add GitHub as new `origin`, and ensure branch is `main`.
- Create a single root squash commit from the final release tree.
- Move tag `0.6` to the new root commit.
- Force-push `main` and tag `0.6` to both `origin` and `origin2`.
- Remove old remote tag `0.5` so old history is not kept reachable through that tag.

## Test Plan

- Run `pnpm check` and `pnpm build`.
- Run `pnpm pack:local`.
- Verify packed contents include `build/`, `bin/`, `scripts/`, `fixtures/minimal-graph.sqlite`, `.env.example`, and `README.md`.
- Smoke-test the packed tarball from a temporary consumer directory with no GhostCrab DB to confirm demo fallback starts.
- Smoke-test with `GHOSTCRAB_SQLITE_PATH` or `--sqlite` pointed at a real GhostCrab SQLite to confirm backend wiring.

## Assumptions

- npm publication itself is manual and happens later.
- The final public release surface is `main` plus tag `0.6` on both GitHub and GitLab.
- Pre-existing unrelated dirty worktree changes are preserved but excluded from the release commit.
