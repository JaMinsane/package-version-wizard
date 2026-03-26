import { env as privateEnv } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import { getAppBaseUrl } from '$lib/server/app-url';
import { startUploadedAnalysis } from '$lib/server/analysis/service';
import { parseUploadedPackageJson } from '$lib/server/package-json/manifest';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const appBaseUrl = getAppBaseUrl();

	return {
		environmentReady: {
			databaseConfigured: Boolean(privateEnv.DATABASE_URL),
			webhookConfigured: Boolean(
				privateEnv.N8N_ANALYSIS_WEBHOOK_URL && privateEnv.N8N_ANALYSIS_WEBHOOK_TOKEN
			),
			callbackConfigured: Boolean(privateEnv.N8N_CALLBACK_SECRET),
			publicAppConfigured: Boolean(appBaseUrl)
		}
	};
};

export const actions: Actions = {
	analyzePackageJson: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const packageJsonFile = formData.get('packageJson');
		if (!(packageJsonFile instanceof File)) {
			return fail(400, {
				message: 'Selecciona un package.json para iniciar el análisis.'
			});
		}

		let analysisId: string;

		try {
			const parsedManifest = await parseUploadedPackageJson(packageJsonFile);

			({ analysisId } = await startUploadedAnalysis({
				parsedManifest,
				requestedByUserId: locals.user.id,
				requestedByUserName: locals.user.name
			}));
		} catch (error) {
			return fail(400, {
				message:
					error instanceof Error
						? error.message
						: 'No se pudo iniciar el análisis del package.json.'
			});
		}

		throw redirect(303, `/analysis/${analysisId}`);
	}
};
