import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';

import type { Actions, PageServerLoad } from './$types';
import { buildAnalysisUrl } from '$lib/server/app-url';
import { getOwnedProjectForAnalysis } from '$lib/server/analysis/repository';
import { getAnalysisSnapshot } from '$lib/server/analysis/service';
import {
	getAnalysisSlackPanelData,
	saveProjectSlackSettingsFromForm
} from '$lib/server/slack/service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const analysis = await getAnalysisSnapshot(params.id);

	if (!analysis) {
		throw error(404, 'Ese análisis no existe o ya no está disponible.');
	}

	return {
		analysis,
		shareUrl: buildAnalysisUrl(params.id),
		slack: await getAnalysisSlackPanelData({
			viewerUserId: locals.user?.id,
			projectOwnerUserId: analysis.project.ownerUserId,
			projectId: analysis.project.id
		})
	};
};

export const actions: Actions = {
	saveProjectSlackSettings: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const project = await getOwnedProjectForAnalysis(params.id, locals.user.id);

		if (!project) {
			return fail(403, {
				errorMessage: 'Solo el owner del proyecto puede cambiar la configuración de Slack.'
			});
		}

		const formData = await request.formData();

		try {
			await saveProjectSlackSettingsFromForm({
				projectId: project.id,
				userId: locals.user.id,
				formData
			});

			return {
				successMessage: 'La configuración de Slack para este proyecto quedó guardada.'
			};
		} catch (error) {
			return fail(400, {
				errorMessage: getFormErrorMessage(error)
			});
		}
	}
};

function getFormErrorMessage(error: unknown) {
	if (error instanceof ZodError) {
		return error.issues[0]?.message ?? 'Revisa la configuración del proyecto.';
	}

	return error instanceof Error
		? error.message
		: 'No se pudo guardar la configuración de Slack del proyecto.';
}
