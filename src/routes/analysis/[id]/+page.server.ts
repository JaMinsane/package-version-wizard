import { env as privateEnv } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import {
	getAnalysisSnapshot,
	updateSlackSubscriptionForAnalysis
} from '$lib/server/analysis/service';
import type { SlackFrequency } from '$lib/server/analysis/types';

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
	saveSlackSubscription: async ({ params, request }) => {
		const formData = await request.formData();
		const enabled = formData.get('enabled') === 'on';
		const channelTarget = asOptionalString(formData.get('channelTarget'));
		const frequency = asSlackFrequency(formData.get('frequency'));

		if (enabled && !channelTarget) {
			return fail(400, {
				message: 'Activa Slack solo si defines un canal o destino para el radar.'
			});
		}

		try {
			await updateSlackSubscriptionForAnalysis(params.id, {
				enabled,
				channelTarget,
				frequency
			});
		} catch (error) {
			return fail(400, {
				message:
					error instanceof Error
						? error.message
						: 'No se pudo actualizar la automatización de Slack.'
			});
		}

		return {
			message: enabled
				? 'Slack quedó conectado para recibir radar continuo.'
				: 'La automatización de Slack quedó desactivada para este proyecto.'
		};
	}
};

function asOptionalString(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
}

function asSlackFrequency(value: FormDataEntryValue | null): SlackFrequency {
	if (value === 'weekdays' || value === 'twice_daily') {
		return value;
	}

	return 'daily';
}

function buildShareUrl(id: string, rawBaseUrl: string | undefined) {
	const baseUrl = rawBaseUrl?.trim().replace(/\/$/, '');

	return baseUrl ? `${baseUrl}/analysis/${id}` : undefined;
}
