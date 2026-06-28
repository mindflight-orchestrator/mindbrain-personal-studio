export type WorkspaceProfile =
	| { mode: 'hub-spokes'; bridge: string; satellites: string[] }
	| {
			mode: 'dual-layer';
			layers: [string, string];
			defaultLayer: 'first' | 'second' | 'combined';
	  };

export const WORKSPACE_PROFILES: Record<string, WorkspaceProfile> = {
	'tp-chantier-poc': { mode: 'hub-spokes', bridge: 'pm', satellites: [] },
	'navy-cyberthreats': {
		mode: 'dual-layer',
		layers: ['topology', 'pipeline'],
		defaultLayer: 'first'
	}
};
