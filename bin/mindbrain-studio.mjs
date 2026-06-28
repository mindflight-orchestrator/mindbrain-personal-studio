#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const binDir = dirname(fileURLToPath(import.meta.url));
const studioRoot = resolve(binDir, "..");
const child = spawn(process.execPath, [
	resolve(studioRoot, "scripts", "studio-sqlite.mjs"),
	"--serve",
	...process.argv.slice(2)
], {
	cwd: studioRoot,
	env: process.env,
	stdio: "inherit"
});

child.on("exit", (code, signal) => {
	process.exitCode = code ?? (signal ? 128 : 0);
});
