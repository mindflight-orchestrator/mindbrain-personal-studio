/**
 * Async generator that reads a Fetch Response body as NDJSON (newline-delimited JSON).
 * Each non-empty line is parsed and yielded as soon as it arrives — no need to wait for
 * the full response body, enabling progressive rendering on the client.
 *
 * Handles partial lines correctly: lines split across multiple chunks are buffered and
 * completed before yielding.
 */
export async function* readNDJSON<T>(res: Response): AsyncGenerator<T> {
	if (!res.body) throw new Error('Response body is null');
	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let buf = '';
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			buf += value;
			let idx: number;
			while ((idx = buf.indexOf('\n')) !== -1) {
				const line = buf.slice(0, idx).trim();
				buf = buf.slice(idx + 1);
				if (line) yield JSON.parse(line) as T;
			}
		}
		const tail = buf.trim();
		if (tail) yield JSON.parse(tail) as T;
	} finally {
		reader.releaseLock();
	}
}
