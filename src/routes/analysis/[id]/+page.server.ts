import { env as privateEnv } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import { getAnalysisSnapshot } from '$lib/server/analysis/service';

export const load: PageServerLoad = async ({ params }) => {
	const analysis = await getAnalysisSnapshot(params.id);
	const appBaseUrl = privateEnv.APP_BASE_URL || privateEnv.PUBLIC_APP_URL;

	if (!analysis) {
		throw error(404, 'Ese análisis no existe o ya no está disponible.');
	}

	return {
		analysis,
		shareUrl: buildShareUrl(params.id, appBaseUrl),
		radarReady: Boolean(privateEnv.N8N_INTERNAL_API_TOKEN && appBaseUrl)
	};
};

export const actions: Actions = {
	saveSlackSubscription: async () => {
		// Mock implementation to act as a shell without DB interaction
		return {
			message: 'Slack quedó conectado para recibir radar continuo (MOCK).'
		};
	}
};


function buildShareUrl(id: string, rawBaseUrl: string | undefined) {
	const baseUrl = rawBaseUrl?.trim().replace(/\/$/, '');

	return baseUrl ? `${baseUrl}/analysis/${id}` : undefined;
}
