import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { getAnalysisSnapshot } from '$lib/server/analysis/service';

export const GET: RequestHandler = async ({ params }) => {
	const analysis = await getAnalysisSnapshot(params.id);

	if (!analysis) {
		return json({ message: 'Ese análisis no existe o ya no está disponible.' }, { status: 404 });
	}

	return json(analysis);
};
