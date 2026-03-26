import { env } from '$env/dynamic/private';

export function getAppBaseUrl() {
	const baseUrl = env.APP_BASE_URL?.trim().replace(/\/$/, '');

	return baseUrl || undefined;
}

export function buildAnalysisUrl(analysisId: string) {
	const baseUrl = getAppBaseUrl();

	return baseUrl ? `${baseUrl}/analysis/${analysisId}` : undefined;
}
