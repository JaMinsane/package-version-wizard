import { redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import {
	createSlackInstallUrl,
	getSlackOAuthStateCookieName,
	isSlackInstallConfigured
} from '$lib/server/slack/service';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (!isSlackInstallConfigured()) {
		throw redirect(303, '/settings/integrations/slack');
	}

	const { state, url } = createSlackInstallUrl();
	cookies.set(getSlackOAuthStateCookieName(), state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.startsWith('https://'),
		maxAge: 60 * 10
	});

	throw redirect(302, url);
};
