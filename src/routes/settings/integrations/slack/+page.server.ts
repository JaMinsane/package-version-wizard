import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';

import type { Actions, PageServerLoad } from './$types';
import {
	disconnectSlackWorkspace,
	getSlackSettingsPageData,
	saveUserSlackPreferencesFromForm
} from '$lib/server/slack/service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		slack: await getSlackSettingsPageData(locals.user.id)
	};
};

export const actions: Actions = {
	savePreferences: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();

		try {
			await saveUserSlackPreferencesFromForm(locals.user.id, formData);

			return {
				successMessage: 'Configuración de Slack guardada.'
			};
		} catch (error) {
			return fail(400, {
				errorMessage: getFormErrorMessage(error)
			});
		}
	},
	disconnectWorkspace: async ({ locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		try {
			await disconnectSlackWorkspace(locals.user.id);

			return {
				successMessage: 'Workspace de Slack desconectado y limpiado de la base de datos.'
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
		return error.issues[0]?.message ?? 'Revisa los campos de Slack.';
	}

	return error instanceof Error ? error.message : 'Error al guardar la configuración de Slack.';
}
