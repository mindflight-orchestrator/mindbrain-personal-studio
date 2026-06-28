import type { DirectedGraph } from 'graphology';

/**
 * Nodes within `depth` hops from `center`, following both out- and in-edges (undirected-style ego network).
 */
export function undirectedNeighborhood(
	graph: DirectedGraph,
	center: string,
	depth: number
): Set<string> {
	const result = new Set<string>([center]);
	let frontier: string[] = [center];
	for (let d = 0; d < depth; d++) {
		const next: string[] = [];
		for (const n of frontier) {
			graph.forEachOutNeighbor(n, (m) => {
				if (!result.has(m)) {
					result.add(m);
					next.push(m);
				}
			});
			graph.forEachInNeighbor(n, (m) => {
				if (!result.has(m)) {
					result.add(m);
					next.push(m);
				}
			});
		}
		frontier = next;
	}
	return result;
}
