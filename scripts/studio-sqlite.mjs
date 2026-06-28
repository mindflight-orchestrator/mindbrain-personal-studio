#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadDotEnv, resolveStudioDataTarget, runtimePathsForSqlite, studioRootFromScript } from "./lib/sqlite-runtime.mjs";

function parseMode(args) {
	const filtered = [];
	let serve = false;
	for (const arg of args) {
		if (arg === "--serve") {
			serve = true;
			continue;
		}
		if (arg === "--dev") continue;
		filtered.push(arg);
	}
	return { serve, filtered };
}

const studioRoot = studioRootFromScript(import.meta.url);
loadDotEnv(studioRoot);
const { serve, filtered } = parseMode(process.argv.slice(2));
const { sqlitePath, passthrough, mode, fallbackReason } = resolveStudioDataTarget(studioRoot, filtered);
if (fallbackReason) {
	console.error(`==> ${fallbackReason}; using packaged demo fixture.`);
}

if (mode === "brain") {
	const backend = spawn(process.execPath, [
		"scripts/backend-sqlite.mjs",
		"--sqlite",
		sqlitePath,
		"--detach"
	], {
		cwd: studioRoot,
		env: process.env,
		stdio: "inherit"
	});

	const backendCode = await new Promise((resolveExit) => {
		backend.on("exit", (code) => resolveExit(code ?? 0));
	});

	if (backendCode !== 0) {
		process.exit(backendCode);
	}
}

const runtime = runtimePathsForSqlite(studioRoot, sqlitePath);
const env = {
	...process.env,
	GHOSTCRAB_SQLITE_PATH: sqlitePath,
	DATA_SOURCE: mode,
	MINDBRAIN_RUNTIME_SOURCE: mode === "brain" ? "runtime-json" : "demo-fixture",
	MINDBRAIN_RUNTIME_PATH: mode === "brain" ? runtime.jsonPath : ""
};
const command = serve ? resolve(studioRoot, "build", "index.js") : "scripts/dev-sqlite.mjs";
const args = serve ? passthrough : ["--sqlite", sqlitePath, ...passthrough];

if (serve && !existsSync(command)) {
	console.error("error: build/index.js not found. Run pnpm build before starting the packaged Studio.");
	process.exit(1);
}

const child = spawn(process.execPath, [command, ...args], {
	cwd: studioRoot,
	env,
	stdio: "inherit"
});

child.on("exit", (code, signal) => {
	process.exitCode = code ?? (signal ? 128 : 0);
});
