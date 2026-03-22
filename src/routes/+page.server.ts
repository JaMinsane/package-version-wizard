import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import { buildDemoAnalysisRequest } from '$lib/server/demo/payload';
import { createDemoRun, getDemoRun, markWebhookAccepted, markWebhookFailed } from '$lib/server/demo/store';
import { sendAnalysisToN8n } from '$lib/server/n8n/client';

export const load: PageServerLoad = async ({ url }) => {
	const runId = url.searchParams.get('run');

	return {
		activeRun: runId ? getDemoRun(runId) : null,
		environmentReady: {
			webhookConfigured: Boolean(env.N8N_ANALYSIS_WEBHOOK_URL && env.N8N_ANALYSIS_WEBHOOK_TOKEN),
			callbackConfigured: Boolean(env.N8N_CALLBACK_SECRET)
		}
	};
};

export const actions: Actions = {
	runDemo: async () => {
		const requestPayload = buildDemoAnalysisRequest();

		createDemoRun(requestPayload);

		try {
			const response = await sendAnalysisToN8n(requestPayload);
			markWebhookAccepted(requestPayload.analysisId, response);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'No se pudo enviar la corrida demo a n8n.';
			markWebhookFailed(requestPayload.analysisId, message);
		}

		throw redirect(303, `/?run=${requestPayload.analysisId}`);
	}
};
