export function parseJsonObject(raw: unknown): Record<string, unknown> {
	if (!raw) return {};
	if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
	if (typeof raw !== 'string') return {};
	try {
		const value = JSON.parse(raw);
		return value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

export function formatUnixDate(unix: unknown): string | null {
	const n = Number(unix);
	if (!Number.isFinite(n) || n <= 0) return null;
	return new Date(n * 1000).toISOString().slice(0, 10);
}

export function scalarRows(obj: Record<string, unknown>, skip = new Set<string>()): Array<[string, string]> {
	const rows: Array<[string, string]> = [];
	for (const [key, value] of Object.entries(obj)) {
		if (skip.has(key)) continue;
		if (value == null || value === '') continue;
		if (typeof value === 'object') continue;
		rows.push([key, String(value)]);
	}
	return rows;
}

export type TripleRow = {
	subject: string;
	predicate: string;
	object_value: string;
	object_kind?: string;
};

export function extractTriples(raw: Record<string, unknown>): TripleRow[] {
	const triples = raw.triples;
	if (!Array.isArray(triples)) return [];
	const rows: TripleRow[] = [];
	for (const t of triples) {
		if (!t || typeof t !== 'object') continue;
		const row = t as Record<string, unknown>;
		const predicate = String(row.predicate ?? '');
		if (!predicate) continue;
		rows.push({
			subject: String(row.subject ?? ''),
			predicate,
			object_value: String(row.object_value ?? row.object ?? ''),
			object_kind: row.object_kind == null ? undefined : String(row.object_kind)
		});
	}
	return rows;
}

export function definitionFromTriples(triples: TripleRow[]): string | null {
	for (const t of triples) {
		const p = t.predicate.toLowerCase();
		if (p.includes('definition') || p.endsWith('comment') || p.endsWith('label')) {
			return t.object_value;
		}
	}
	return null;
}
