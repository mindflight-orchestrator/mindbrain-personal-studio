/**
 * MindBrain subgraph responses may serialize enum `kind` fields as Zig debug
 * literals instead of JSON strings. Repair before JSON.parse.
 */
export function repairMindbrainJson(raw: string): string {
	return raw
		.replace(
			/"kind":\.\{\s*\.value\s*=\s*\{\s*([^}]+)\s*\}\s*,\s*\.options\s*=\s*\.\{[^}]*\}\s*\}/g,
			(_match, bytesStr: string) => {
				const bytes = bytesStr
					.split(',')
					.map((s) => Number(s.trim()))
					.filter((n) => Number.isFinite(n));
				return `"kind":"${String.fromCharCode(...bytes)}"`;
			}
		)
		.replace(/,,+/g, ',');
}

export function parseMindbrainJson<T>(raw: string): T {
	return JSON.parse(repairMindbrainJson(raw)) as T;
}
