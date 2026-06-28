/**
 * Generic NDJSON consumer over `fetch`. Yields one decoded JSON object per
 * newline-delimited record. Aborting via `AbortController` cancels both the
 * HTTP request and the underlying server-side cursor (the stream endpoint
 * listens to `request.signal`).
 */
export async function* readNdjson<T>(
	url: string,
	init: RequestInit = {}
): AsyncGenerator<T, void, unknown> {
	const res = await fetch(url, init);
	if (!res.ok) {
		throw new Error(`NDJSON request failed: ${res.status} ${res.statusText}`);
	}
	if (!res.body) {
		throw new Error('NDJSON response has no body');
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder('utf-8');
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });

			let newlineIdx = buffer.indexOf('\n');
			while (newlineIdx >= 0) {
				const line = buffer.slice(0, newlineIdx).trim();
				buffer = buffer.slice(newlineIdx + 1);
				if (line.length > 0) {
					yield JSON.parse(line) as T;
				}
				newlineIdx = buffer.indexOf('\n');
			}
		}

		const tail = buffer.trim();
		if (tail.length > 0) {
			yield JSON.parse(tail) as T;
		}
	} finally {
		reader.releaseLock();
	}
}

export type GraphStreamRow =
	| {
			seq: number;
			kind: 'seed_node' | 'node';
			payload: {
				id: number | string;
				type: string;
				name: string;
				confidence?: number | null;
				workspace_id?: string | null;
				metadata?: Record<string, unknown> | null;
				deprecated_at?: string | null;
				created_at?: string | null;
			};
	  }
	| {
			seq: number;
			kind: 'edge';
			payload: {
				id: number | string;
				type: string;
				source_id: number | string;
				target_id: number | string;
				source_name?: string | null;
				target_name?: string | null;
				confidence?: number | null;
				metadata?: Record<string, unknown> | null;
			};
	  }
	| {
			seq: number;
			kind: 'done';
			payload: Record<string, unknown>;
	  }
	| {
			seq: number;
			kind: 'error';
			payload: { message: string };
	  };
