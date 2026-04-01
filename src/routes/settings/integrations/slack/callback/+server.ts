import { redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import {
	completeSlackInstallation,
	getSlackOAuthStateCookieName,
	parseSlackOAuthStateCookieValue
} from '$lib/server/slack/service';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const state = url.searchParams.get('state');
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');
	const expectedState = parseSlackOAuthStateCookieValue(
		cookies.get(getSlackOAuthStateCookieName())
	);

	cookies.delete(getSlackOAuthStateCookieName(), { path: '/' });

	if (error) {
		throw redirect(303, '/settings/integrations/slack?slack=denied');
	}

	if (
		!state ||
		!expectedState ||
		expectedState.userId !== locals.user.id ||
		state !== expectedState.state ||
		!code
	) {
		throw redirect(303, '/settings/integrations/slack?slack=invalid-state');
	}

	let workspace;

	try {
		workspace = await completeSlackInstallation({
			code,
			userId: locals.user.id
		});
	} catch {
		throw redirect(303, '/settings/integrations/slack?slack=connect-error');
	}

	if (workspace?.n8nSyncStatus === 'synced') {
		throw redirect(303, '/settings/integrations/slack?slack=connected');
	}

	throw redirect(303, '/settings/integrations/slack?slack=connected-sync-error');
};
