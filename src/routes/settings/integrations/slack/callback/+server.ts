import { redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { completeSlackInstallation, getSlackOAuthStateCookieName } from '$lib/server/slack/service';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const state = url.searchParams.get('state');
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');
	const expectedState = cookies.get(getSlackOAuthStateCookieName());

	cookies.delete(getSlackOAuthStateCookieName(), { path: '/' });

	if (error) {
		throw redirect(303, '/settings/integrations/slack?slack=denied');
	}

	if (!state || !expectedState || state !== expectedState || !code) {
		throw redirect(303, '/settings/integrations/slack?slack=invalid-state');
	}

	try {
		await completeSlackInstallation({
			code,
			userId: locals.user.id
		});
	} catch {
		throw redirect(303, '/settings/integrations/slack?slack=connect-error');
	}

	throw redirect(303, '/settings/integrations/slack?slack=connected');
};
