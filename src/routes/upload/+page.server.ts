import { env as privateEnv } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import { startUploadedAnalysis } from '$lib/server/analysis/service';
import type { SlackFrequency } from '$lib/server/analysis/types';
import { parseUploadedPackageJson } from '$lib/server/package-json/manifest';

export const load: PageServerLoad = async () => {
	const appBaseUrl = privateEnv.APP_BASE_URL || privateEnv.PUBLIC_APP_URL;

	return {
		environmentReady: {
			databaseConfigured: Boolean(privateEnv.DATABASE_URL),
			webhookConfigured: Boolean(
				privateEnv.N8N_ANALYSIS_WEBHOOK_URL && privateEnv.N8N_ANALYSIS_WEBHOOK_TOKEN
			),
			callbackConfigured: Boolean(privateEnv.N8N_CALLBACK_SECRET),
			publicAppConfigured: Boolean(appBaseUrl),
			radarConfigured: Boolean(privateEnv.N8N_INTERNAL_API_TOKEN)
		}
	};
};

export const actions: Actions = {
	analyzePackageJson: async ({ request }) => {
		const formData = await request.formData();
		const packageJsonFile = formData.get('packageJson');
		const subscribeSlack = formData.get('subscribeSlack') === 'on';
		const slackChannelTarget = asOptionalString(formData.get('slackChannelTarget'));
		const slackFrequency = asSlackFrequency(formData.get('slackFrequency'));

		if (!(packageJsonFile instanceof File)) {
			return fail(400, {
				message: 'Selecciona un package.json para iniciar el análisis.',
				values: {
					subscribeSlack,
					slackChannelTarget,
					slackFrequency
				}
			});
		}

		if (subscribeSlack && !slackChannelTarget) {
			return fail(400, {
				message: 'Activa Slack solo si indicas el canal o destino que recibirá el radar.',
				values: {
					subscribeSlack,
					slackChannelTarget,
					slackFrequency
				}
			});
		}

		let analysisId: string;

		try {
			const parsedManifest = await parseUploadedPackageJson(packageJsonFile);

			({ analysisId } = await startUploadedAnalysis({
				parsedManifest,
				slackSubscription: subscribeSlack
					? {
							enabled: true,
							channelTarget: slackChannelTarget,
							frequency: slackFrequency
						}
					: undefined
			}));
		} catch (error) {
			return fail(400, {
				message:
					error instanceof Error
						? error.message
						: 'No se pudo iniciar el análisis del package.json.',
				values: {
					subscribeSlack,
					slackChannelTarget,
					slackFrequency
				}
			});
		}

		throw redirect(303, `/analysis/${analysisId}`);
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
