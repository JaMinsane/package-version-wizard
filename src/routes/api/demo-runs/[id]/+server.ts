import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { getDemoRun } from '$lib/server/demo/store';

export const GET: RequestHandler = async ({ params }) => {
	const run = getDemoRun(params.id);

	if (!run) {
		return json({ message: 'La corrida demo no existe o ya no está disponible.' }, { status: 404 });
	}

	return json(run);
};
