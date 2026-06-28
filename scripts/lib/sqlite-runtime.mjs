import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

export const DEMO_SQLITE_PATH = "fixtures/minimal-graph.sqlite";
export const RUNTIME_DIR = "data/runtime";

export function studioRootFromScript(importMetaUrl) {
	const url = new URL(importMetaUrl);
	return resolve(url.pathname, "..", "..");
}

export function loadDotEnv(studioRoot) {
	const envPath = resolve(studioRoot, ".env");
	if (!existsSync(envPath)) return;
	const content = readFileSync(envPath, "utf8");
	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const separator = trimmed.indexOf("=");
		if (separator <= 0) continue;
		const key = trimmed.slice(0, separator).trim();
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;
		let value = trimmed.slice(separator + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		process.env[key] = value;
	}
}

export function expandHome(path) {
	if (path === "~") return homedir();
	if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
	return path;
}

export function ghostcrabDataDir() {
	if (process.env.GHOSTCRAB_DATA_DIR) return resolve(expandHome(process.env.GHOSTCRAB_DATA_DIR));
	if (process.env.GHOSTCRAB_HOME) return resolve(expandHome(process.env.GHOSTCRAB_HOME));
	return join(homedir(), ".ghostcrab");
}

export function defaultGhostcrabSqlitePath() {
	return join(ghostcrabDataDir(), "databases", "ghostcrab.sqlite");
}

export function runtimePathsForSqlite(studioRoot, sqlitePath) {
	const resolvedSqlitePath = resolve(sqlitePath);
	const hash = createHash("sha256").update(resolvedSqlitePath).digest("hex").slice(0, 12);
	const name = basename(resolvedSqlitePath, ".sqlite")
		.replace(/[^A-Za-z0-9_.-]+/g, "-")
		.replace(/^-+|-+$/g, "") || "sqlite";
	const base = resolve(studioRoot, RUNTIME_DIR, `${name}-${hash}`);
	return {
		jsonPath: `${base}.backend.json`,
		pidPath: `${base}.backend.pid`,
		logPath: `${base}.backend.log`,
		sqlitePath: resolvedSqlitePath
	};
}

export function stripPnpmSeparator(args) {
	return args[0] === "--" ? args.slice(1) : args;
}

export function parseSqliteArgs(args, defaultSqlitePath = defaultGhostcrabSqlitePath()) {
	const rest = stripPnpmSeparator(args);
	const passthrough = [];
	const envSqlitePath = process.env.GHOSTCRAB_SQLITE_PATH?.trim();
	let sqlitePath = envSqlitePath && envSqlitePath !== "auto" ? envSqlitePath : defaultSqlitePath;
	let explicit = Boolean(envSqlitePath && envSqlitePath !== "auto");
	for (let i = 0; i < rest.length; i += 1) {
		const arg = rest[i];
		if (arg === "--sqlite" || arg === "--db") {
			if (!rest[i + 1]) {
				throw new Error(`${arg} requires a SQLite path`);
			}
			sqlitePath = rest[++i];
			explicit = true;
			continue;
		}
		if (arg.startsWith("--sqlite=")) {
			sqlitePath = arg.slice("--sqlite=".length);
			explicit = true;
			continue;
		}
		if (arg.startsWith("--db=")) {
			sqlitePath = arg.slice("--db=".length);
			explicit = true;
			continue;
		}
		passthrough.push(arg);
	}
	return {
		sqlitePath: resolve(expandHome(sqlitePath)),
		explicit,
		passthrough
	};
}

export function resolveStudioDataTarget(studioRoot, args) {
	const parsed = parseSqliteArgs(args);
	if (existsSync(parsed.sqlitePath)) {
		return { ...parsed, mode: "brain", fallbackReason: null };
	}
	if (parsed.explicit) {
		return { ...parsed, mode: "brain", fallbackReason: null };
	}
	return {
		...parsed,
		sqlitePath: resolve(studioRoot, DEMO_SQLITE_PATH),
		mode: "sqlite-demo",
		fallbackReason: `default GhostCrab SQLite not found at ${parsed.sqlitePath}`
	};
}

export function parseAddr(addr) {
	const raw = String(addr || "").trim();
	if (!raw) return null;
	const portText = raw.startsWith(":") ? raw.slice(1) : raw.split(":").at(-1);
	const port = Number.parseInt(portText ?? "", 10);
	return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

export function addrForPort(port) {
	return `127.0.0.1:${port}`;
}

export function baseUrlForPort(port) {
	return `http://127.0.0.1:${port}`;
}

export function isPortFree(port, host = "127.0.0.1") {
	return new Promise((resolveFree) => {
		const srv = createServer();
		srv.once("error", () => resolveFree(false));
		srv.once("listening", () => srv.close(() => resolveFree(true)));
		srv.listen(port, host);
	});
}

export async function findFreePort(base = 8092, range = 20) {
	for (let port = base; port < base + range; port += 1) {
		if (await isPortFree(port)) return port;
	}
	throw new Error(`No free backend port in range ${base}-${base + range - 1}`);
}

export function readRuntimeJson(jsonPath) {
	if (!existsSync(jsonPath)) return null;
	try {
		const value = JSON.parse(readFileSync(jsonPath, "utf8"));
		if (!value || typeof value !== "object") return null;
		if (typeof value.base_url !== "string") return null;
		return value;
	} catch {
		return null;
	}
}

export function samePath(left, right) {
	return resolve(String(left || "")) === resolve(String(right || ""));
}

export function isPidAlive(pid) {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export async function healthOk(baseUrl, timeoutMs = 1000) {
	try {
		const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
			signal: AbortSignal.timeout(timeoutMs)
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function runtimeIsUsable(runtime, sqlitePath) {
	if (!runtime) return false;
	if (!samePath(runtime.sqlite_path, sqlitePath)) return false;
	if (!isPidAlive(Number(runtime.pid))) return false;
	return healthOk(String(runtime.base_url));
}
