import { error } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';
import { getAnalysisSnapshot } from '$lib/server/analysis/service';

export const load: PageServerLoad = async ({ params }) => {
	const analysis = await getAnalysisSnapshot(params.id);

	if (!analysis) {
		throw error(404, 'Ese análisis no existe o ya no está disponible.');
	}

	return { analysis };
};
