#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
	healthOk,
	loadDotEnv,
	readRuntimeJson,
	resolveStudioDataTarget,
	runtimePathsForSqlite,
	studioRootFromScript
} from "./lib/sqlite-runtime.mjs";

const studioRoot = studioRootFromScript(import.meta.url);
loadDotEnv(studioRoot);
const { sqlitePath, passthrough, mode, fallbackReason } = resolveStudioDataTarget(studioRoot, process.argv.slice(2));
const paths = runtimePathsForSqlite(studioRoot, sqlitePath);
const explicitUrl = process.env.MINDBRAIN_HTTP_URL?.trim() || process.env.GHOSTCRAB_MINDBRAIN_URL?.trim();
const runtime = readRuntimeJson(paths.jsonPath);
const baseUrl = explicitUrl || runtime?.base_url;

if (!existsSync(sqlitePath)) {
	console.error(`error: SQLite not found at ${sqlitePath}`);
	console.error("Pass --sqlite /path/to/db.sqlite, or set GHOSTCRAB_SQLITE_PATH.");
	process.exit(1);
}

if (fallbackReason) {
	console.error(`==> ${fallbackReason}; using packaged demo fixture.`);
}

if (mode === "sqlite-demo") {
	console.error(`==> Studio dev demo | SQLite: ${sqlitePath}`);
	const child = spawn(process.execPath, ["./node_modules/vite/bin/vite.js", "dev", ...passthrough], {
		cwd: studioRoot,
		env: {
			...process.env,
			GHOSTCRAB_SQLITE_PATH: sqlitePath,
			DATA_SOURCE: "sqlite-demo",
			MINDBRAIN_RUNTIME_SOURCE: "demo-fixture"
		},
		stdio: "inherit"
	});
	child.on("exit", (code, signal) => {
		process.exitCode = code ?? (signal ? 128 : 0);
	});
} else {
if (!baseUrl) {
	console.error(`error: no backend runtime found at ${paths.jsonPath}`);
	console.error(`Run: pnpm backend -- --sqlite "${sqlitePath}"`);
	process.exit(1);
}

if (!explicitUrl && runtime?.sqlite_path !== sqlitePath) {
	console.error("error: backend runtime points at a different SQLite database");
	console.error(`  runtime: ${runtime?.sqlite_path ?? "unknown"}`);
	console.error(`  expected: ${sqlitePath}`);
	process.exit(1);
}

if (!(await healthOk(baseUrl, 1500))) {
	console.error(`error: GhostCrab backend is not healthy at ${baseUrl}`);
	console.error(`Run: pnpm backend -- --sqlite "${sqlitePath}"`);
	process.exit(1);
}

console.error(`==> Studio dev | SQLite: ${sqlitePath} | Backend: ${baseUrl}`);

const viteArgs = ["./node_modules/vite/bin/vite.js", "dev", ...passthrough];
const child = spawn(process.execPath, viteArgs, {
	cwd: studioRoot,
	env: {
		...process.env,
		GHOSTCRAB_SQLITE_PATH: sqlitePath,
		DATA_SOURCE: "brain",
		MINDBRAIN_HTTP_URL: baseUrl,
		MINDBRAIN_RUNTIME_SOURCE: explicitUrl ? "env" : "runtime-json",
		MINDBRAIN_RUNTIME_PATH: explicitUrl ? "" : paths.jsonPath
	},
	stdio: "inherit"
});

child.on("exit", (code, signal) => {
	process.exitCode = code ?? (signal ? 128 : 0);
});
}
