#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const isDryRun = passthroughArgs.includes("--dry-run");

function loadDotEnvAuth() {
	const envPath = join(repoRoot, ".env");
	if (!existsSync(envPath)) return;

	const text = readFileSync(envPath, "utf8");
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const eq = trimmed.indexOf("=");
		if (eq < 0) continue;

		const key = trimmed.slice(0, eq).trim();
		if (key !== "NODE_AUTH_TOKEN" && key !== "NPM_TOKEN") continue;
		if (process.env[key]?.trim()) continue;

		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		process.env[key] = value;
	}
}

function ensureNpmAuthToken() {
	const fromNode = process.env.NODE_AUTH_TOKEN?.trim();
	const fromNpm = process.env.NPM_TOKEN?.trim();
	if (!fromNode && fromNpm) {
		process.env.NODE_AUTH_TOKEN = fromNpm;
	}
	if (!isDryRun && !process.env.NODE_AUTH_TOKEN?.trim()) {
		console.error(
			"[publish-npm] Missing NODE_AUTH_TOKEN (or NPM_TOKEN).\n" +
				"  Add NODE_AUTH_TOKEN=npm_... to .env at repo root, or export it in the shell.\n" +
				"  Use `pnpm publish:npm -- --dry-run` to validate the package without a token."
		);
		process.exit(1);
	}
}

function createPublishUserconfig() {
	const token = process.env.NODE_AUTH_TOKEN?.trim();
	if (!token || isDryRun) return null;

	const dir = mkdtempSync(join(tmpdir(), "mindbrain-studio-npm-publish-"));
	const npmrcPath = join(dir, "npmrc");
	writeFileSync(
		npmrcPath,
		[
			"registry=https://registry.npmjs.org/",
			`//registry.npmjs.org/:_authToken=${token}`,
			""
		].join("\n"),
		"utf8"
	);
	try {
		chmodSync(npmrcPath, 0o600);
	} catch {
		// Best effort on filesystems that do not support chmod.
	}

	return {
		npmrcPath,
		cleanup: () => rmSync(dir, { recursive: true, force: true })
	};
}

function npmPublishArgs() {
	const args = ["publish", "--access", "public", ...passthroughArgs];
	const otp = process.env.NPM_OTP?.trim();
	if (otp && !args.includes("--otp")) {
		args.push("--otp", otp);
		console.error("[publish-npm] using NPM_OTP for 2FA.");
	}

	const ci = process.env.GITHUB_ACTIONS === "true";
	const noProvenance = process.env.NPM_PUBLISH_NO_PROVENANCE === "1";
	const alreadyHasProvenance =
		args.includes("--provenance") || args.includes("--no-provenance");
	if (ci && !noProvenance && !alreadyHasProvenance) {
		args.splice(1, 0, "--provenance");
		console.error("[publish-npm] using --provenance (GitHub Actions).");
	} else if (!ci && !alreadyHasProvenance) {
		console.error(
			"[publish-npm] publishing without --provenance (local or non-GitHub Actions)."
		);
	}

	return args;
}

function runNpmPublish() {
	const userconfig = createPublishUserconfig();
	const args = userconfig
		? ["--userconfig", userconfig.npmrcPath, ...npmPublishArgs()]
		: npmPublishArgs();

	try {
		const result = spawnSync("npm", args, {
			cwd: repoRoot,
			env: process.env,
			stdio: "inherit"
		});
		process.exit(result.status ?? 1);
	} finally {
		userconfig?.cleanup();
	}
}

loadDotEnvAuth();
ensureNpmAuthToken();
runNpmPublish();
