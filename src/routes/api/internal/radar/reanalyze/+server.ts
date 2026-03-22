import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { startReanalysisFromProject } from '$lib/server/analysis/service';

export const POST: RequestHandler = async ({ request }) => {
	const authError = getInternalAuthError(request.headers.get('x-internal-token'));

	if (authError) {
		return authError;
	}

	let body: unknown;

	try {
		body = (await request.json()) as unknown;
	} catch {
		return json({ message: 'El body debe ser JSON válido.' }, { status: 400 });
	}

	const projectId = getProjectId(body);

	try {
		const result = await startReanalysisFromProject(projectId);

		return json({
			analysisId: result.analysisId,
			status: 'queued'
		});
	} catch (error) {
		return json(
			{
				message:
					error instanceof Error
						? error.message
						: 'No se pudo iniciar el reanálisis del proyecto.'
			},
			{ status: 400 }
		);
	}
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

function getProjectId(value: unknown) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('El body debe contener un objeto con projectId.');
	}

	const projectId = (value as { projectId?: unknown }).projectId;

	if (typeof projectId !== 'string' || !projectId.trim()) {
		throw new Error('El campo projectId es obligatorio.');
	}

	return projectId;
}
