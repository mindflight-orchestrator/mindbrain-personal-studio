import { json, type RequestHandler } from '@sveltejs/kit';
import { brainHealth, resolveDataSource, resolveMindbrainRuntime } from '$lib/server/mindbrainClient';

export const GET: RequestHandler = async () => {
	if (resolveDataSource() === 'sqlite-demo') {
		return json({ online: false, mode: 'sqlite-demo' });
	}
	const runtime = resolveMindbrainRuntime();
	const online = await brainHealth();
	return json({ online, mode: 'brain', runtime });
};
