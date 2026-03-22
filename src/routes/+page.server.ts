import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import { startDemoAnalysis } from '$lib/server/analysis/service';

export const load: PageServerLoad = async () => {
	return {
		environmentReady: {
			databaseConfigured: Boolean(env.DATABASE_URL),
			webhookConfigured: Boolean(env.N8N_ANALYSIS_WEBHOOK_URL && env.N8N_ANALYSIS_WEBHOOK_TOKEN),
			callbackConfigured: Boolean(env.N8N_CALLBACK_SECRET)
		}
	};
};

export const actions: Actions = {
	runDemo: async () => {
		let analysisId: string;

		try {
			({ analysisId } = await startDemoAnalysis());
		} catch (error) {
			return fail(500, {
				message:
					error instanceof Error
						? error.message
						: 'No se pudo iniciar la corrida demo persistida.'
			});
		}

		throw redirect(303, `/analysis/${analysisId}`);
	}
};
