import { env } from '$env/dynamic/private';

import type { N8nAnalysisRequest } from '$lib/server/analysis/types';

const REQUEST_TIMEOUT_MS = 15_000;

export async function sendAnalysisToN8n(payload: N8nAnalysisRequest) {
	const webhookUrl = env.N8N_ANALYSIS_WEBHOOK_URL;
	const webhookToken = env.N8N_ANALYSIS_WEBHOOK_TOKEN;

	if (!webhookUrl) {
		throw new Error('Falta configurar N8N_ANALYSIS_WEBHOOK_URL');
	}

	if (!webhookToken) {
		throw new Error('Falta configurar N8N_ANALYSIS_WEBHOOK_TOKEN');
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-ingress-token': webhookToken
			},
			body: JSON.stringify(payload),
			signal: controller.signal
		});

		const body = (await response.text()) || null;

		if (!response.ok) {
			throw new Error(
				`n8n respondió ${response.status}${body ? ` con: ${body.slice(0, 280)}` : ''}`
			);
		}

		return {
			status: response.status,
			body
		};
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('La llamada al webhook de n8n excedió el timeout de 15 segundos.');
		}

		throw error;
	} finally {
		clearTimeout(timeout);
	}
}
