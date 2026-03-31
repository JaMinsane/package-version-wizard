import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () =>
	json({
		status: 'ok',
		service: 'package-version-wizard',
		timestamp: new Date().toISOString()
	});
