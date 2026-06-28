#!/usr/bin/env node
import { spawn } from "node:child_process";
import { constants, existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import {
	baseUrlForPort,
	findFreePort,
	healthOk,
	loadDotEnv,
	parseAddr,
	readRuntimeJson,
	resolveStudioDataTarget,
	runtimeIsUsable,
	runtimePathsForSqlite,
	stripPnpmSeparator,
	studioRootFromScript
} from "./lib/sqlite-runtime.mjs";

function parseFlags(args) {
	const rest = stripPnpmSeparator(args);
	const detach = rest.includes("--detach");
	const filtered = rest.filter((arg) => arg !== "--detach");
	return { detach, filtered };
}

function platformPackageSuffix() {
	const platform = process.platform;
	const arch = process.arch;
	if (!["darwin", "linux", "win32"].includes(platform)) return null;
	if (!["x64", "arm64"].includes(arch)) return null;
	return `${platform}-${arch}`;
}

function resolveBackendBin(ghostcrabRoot) {
	const suffix = platformPackageSuffix();
	const executable = process.platform === "win32" ? "ghostcrab-backend.exe" : "ghostcrab-backend";
	const configured = process.env.GHOSTCRAB_BACKEND_BIN?.trim();
	const roots = [
		ghostcrabRoot,
		resolve(process.cwd(), "node_modules", "@mindflight", "ghostcrab-personal-mcp"),
		resolve(studioRootFromScript(import.meta.url), "node_modules", "@mindflight", "ghostcrab-personal-mcp")
	].filter(Boolean);
	const candidates = configured ? [resolve(configured)] : [];
	for (const root of roots) {
		candidates.push(resolve(root, "cmd/backend/zig-out/bin", executable));
	}
	if (suffix) {
		for (const root of roots) {
			candidates.push(
				resolve(
					root,
					"node_modules",
					`@mindflight/ghostcrab-personal-mcp-${suffix}`,
					"bin",
					executable
				),
				resolve(root, "prebuilds", suffix, executable),
				resolve(root, "packages", `prebuild-${suffix}`, "bin", executable)
			);
		}
		candidates.push(
			resolve(process.cwd(), "node_modules", `@mindflight/ghostcrab-personal-mcp-${suffix}`, "bin", executable),
			resolve(homedir(), ".ghostcrab", "bin", executable)
		);
	}
	return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

const studioRoot = studioRootFromScript(import.meta.url);
loadDotEnv(studioRoot);
const { detach, filtered } = parseFlags(process.argv.slice(2));
const { sqlitePath, mode, fallbackReason } = resolveStudioDataTarget(studioRoot, filtered);
if (fallbackReason) {
	console.error(`==> ${fallbackReason}; using packaged demo fixture.`);
}
if (mode === "sqlite-demo") {
	console.error(`==> Demo fixture mode; no GhostCrab backend needed: ${sqlitePath}`);
	process.exit(0);
}
const ghostcrabRoot = process.env.GHOSTCRAB_ROOT
	? resolve(process.env.GHOSTCRAB_ROOT)
	: resolve(studioRoot, "..", "ghostcrab-personal-mcp");
const backendBin = resolveBackendBin(ghostcrabRoot);
const paths = runtimePathsForSqlite(studioRoot, sqlitePath);
const runtimeJson = readRuntimeJson(paths.jsonPath);

if (!existsSync(sqlitePath)) {
	console.error(`error: SQLite not found at ${sqlitePath}`);
	console.error("Pass --sqlite /path/to/db.sqlite, or set GHOSTCRAB_SQLITE_PATH.");
	process.exit(1);
}

if (!existsSync(backendBin)) {
	console.error(`error: ghostcrab-backend not found at ${backendBin}`);
	console.error("Run in ghostcrab-personal-mcp: pnpm run backend:build");
	process.exit(1);
}

if (!process.env.GHOSTCRAB_BACKEND_ADDR && (await runtimeIsUsable(runtimeJson, sqlitePath))) {
	console.error(`==> Reusing GhostCrab backend ${runtimeJson.base_url}`);
	console.error(`    pid: ${runtimeJson.pid}`);
	console.error(`    DB:  ${runtimeJson.sqlite_path}`);
	console.error(`    Runtime: ${paths.jsonPath}`);
	process.exit(0);
}

const explicitPort = parseAddr(process.env.GHOSTCRAB_BACKEND_ADDR);
const port = explicitPort ?? (await findFreePort(8092, 50));
const backendAddr = process.env.GHOSTCRAB_BACKEND_ADDR || `127.0.0.1:${port}`;
const baseUrl = baseUrlForPort(port);

mkdirSync(dirname(paths.jsonPath), { recursive: true });

console.error(`==> GhostCrab backend on ${backendAddr}`);
console.error(`    URL: ${baseUrl}`);
console.error(`    DB:  ${sqlitePath}`);
console.error(`    Runtime: ${paths.jsonPath}`);
console.error("");

const logFd = openSync(paths.logPath, constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND);
const child = spawn(backendBin, [], {
	env: {
		...process.env,
		GHOSTCRAB_SQLITE_PATH: sqlitePath,
		GHOSTCRAB_BACKEND_ADDR: backendAddr
	},
	stdio: detach ? ["ignore", logFd, logFd] : ["ignore", "inherit", logFd],
	detached: detach
});

let childExited = false;
let childExitCode = null;
child.on("exit", (code) => {
	childExited = true;
	childExitCode = code;
});

child.on("error", (err) => {
	console.error(`error: failed to spawn backend: ${err.message}`);
	process.exit(1);
});

const deadline = Date.now() + 15_000;
while (Date.now() < deadline) {
	if (childExited) {
		console.error(`error: backend exited early with code ${childExitCode ?? "unknown"}`);
		process.exit(childExitCode ?? 1);
	}
	if (await healthOk(baseUrl)) {
		const runtime = {
			schema_version: 1,
			pid: child.pid,
			port,
			base_url: baseUrl,
			sqlite_path: sqlitePath,
			backend_addr: backendAddr,
			started_at: new Date().toISOString(),
			source: "mindbrain-personal-studio:sqlite"
		};
		writeFileSync(paths.pidPath, `${child.pid}:${port}:studio\n`, "utf8");
		writeFileSync(paths.jsonPath, `${JSON.stringify(runtime, null, 2)}\n`, "utf8");
		console.error(`==> Backend healthy: ${baseUrl}/health`);
		console.error(`    Smoke: curl -fsS ${baseUrl}/api/mindbrain/workspace/list`);
		break;
	}
	await new Promise((resolveWait) => setTimeout(resolveWait, 150));
}

if (!(await healthOk(baseUrl))) {
	console.error("error: backend did not become healthy within 15s");
	child.kill();
	process.exit(1);
}

if (detach) {
	child.unref();
	process.exit(0);
}

function stopChild(signal) {
	if (!child.killed) child.kill(signal);
}

process.on("SIGINT", () => stopChild("SIGINT"));
process.on("SIGTERM", () => stopChild("SIGTERM"));

child.on("exit", (code, signal) => {
	process.exitCode = code ?? (signal ? 128 : 0);
});
