/**
 * Shared types for the streaming-canvas hover-panel facet interactions.
 *
 * Defined in a standalone module (rather than re-exported from
 * `StreamingGraphCanvas.svelte`) because Svelte 5 does not surface
 * `export type` declarations from the instance `<script lang="ts">` block.
 */

/**
 * Source of a facet click bubbled up from the hover panel:
 *   - `first-class` → the row was a top-level entity column the server can
 *     filter on natively (`type`, `workspace_id`); the parent typically
 *     re-streams.
 *   - `metadata`    → the row was an arbitrary `metadata.*` key. Some keys
 *     (e.g. `scenario_id`) the server can filter on; everything else is
 *     applied as a client-side facet hide via the `facetFilters` prop.
 */
export type FacetClickSource = 'first-class' | 'metadata';

export type FacetClickHandler = (
	key: string,
	value: string,
	source: FacetClickSource
) => void;
