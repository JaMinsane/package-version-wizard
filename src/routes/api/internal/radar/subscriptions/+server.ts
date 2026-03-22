import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { getRadarSubscriptionRecords } from '$lib/server/analysis/service';

export const GET: RequestHandler = async ({ request }) => {
	const authError = getInternalAuthError(request.headers.get('x-internal-token'));

	if (authError) {
		return authError;
	}

	const subscriptions = await getRadarSubscriptionRecords();

	return json({
		subscriptions
	});
};

function getInternalAuthError(token: string | null) {
	if (!env.N8N_INTERNAL_API_TOKEN) {
		return json({ message: 'Falta configurar N8N_INTERNAL_API_TOKEN.' }, { status: 500 });
	}

	if (token !== env.N8N_INTERNAL_API_TOKEN) {
		return json({ message: 'Token interno inválido.' }, { status: 401 });
	}

	return null;
}
