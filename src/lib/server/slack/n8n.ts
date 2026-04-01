import { env } from '$env/dynamic/private';

export const MANAGED_N8N_SLACK_CREDENTIAL_NAME = 'Package Version Wizard Slack Bot';

interface N8nCredentialRecord {
	id: string;
	name: string;
	type: string;
}

export async function syncManagedSlackCredential(accessToken: string) {
	const credentials = await listN8nCredentials();
	const existing = credentials.find(
		(credential) =>
			credential.name === MANAGED_N8N_SLACK_CREDENTIAL_NAME && credential.type === 'slackApi'
	);

	if (existing) {
		await saveN8nCredential(existing.id, accessToken, 'PUT');

		return {
			credentialId: existing.id,
			credentialName: MANAGED_N8N_SLACK_CREDENTIAL_NAME
		};
	}

	const created = await createN8nCredential(accessToken);

	return {
		credentialId: created.id,
		credentialName: created.name
	};
}

async function listN8nCredentials() {
	const payload = await n8nRequest('/api/v1/credentials');

	if (Array.isArray(payload)) {
		return payload as N8nCredentialRecord[];
	}

	if (
		payload &&
		typeof payload === 'object' &&
		Array.isArray((payload as { data?: unknown }).data)
	) {
		return (payload as { data: N8nCredentialRecord[] }).data;
	}

	throw new Error('n8n devolvió una lista de credenciales con formato inesperado.');
}

async function createN8nCredential(accessToken: string) {
	const payload = await n8nRequest('/api/v1/credentials', {
		method: 'POST',
		body: JSON.stringify({
			name: MANAGED_N8N_SLACK_CREDENTIAL_NAME,
			type: 'slackApi',
			data: buildSlackCredentialData(accessToken)
		})
	});

	return asCredentialRecord(payload);
}

async function saveN8nCredential(
	credentialId: string,
	accessToken: string,
	method: 'PUT' | 'PATCH'
) {
	try {
		await n8nRequest(`/api/v1/credentials/${credentialId}`, {
			method,
			body: JSON.stringify({
				name: MANAGED_N8N_SLACK_CREDENTIAL_NAME,
				type: 'slackApi',
				data: buildSlackCredentialData(accessToken)
			})
		});
	} catch (error) {
		if (method === 'PUT') {
			await saveN8nCredential(credentialId, accessToken, 'PATCH');
			return;
		}

		throw error;
	}
}

async function n8nRequest(path: string, init?: RequestInit) {
	const baseUrl = env.N8N_API_BASE_URL?.trim().replace(/\/$/, '');
	const apiKey = env.N8N_API_KEY?.trim();

	if (!baseUrl) {
		throw new Error('Falta configurar N8N_API_BASE_URL.');
	}

	if (!apiKey) {
		throw new Error('Falta configurar N8N_API_KEY.');
	}

	const response = await fetch(`${baseUrl}${path}`, {
		...init,
		headers: {
			'content-type': 'application/json',
			'X-N8N-API-KEY': apiKey,
			...(init?.headers ?? {})
		}
	});

	if (!response.ok) {
		const body = (await response.text()) || null;
		throw new Error(
			`n8n API respondió ${response.status}${body ? ` con: ${body.slice(0, 280)}` : ''}`
		);
	}

	if (response.status === 204) {
		return null;
	}

	return response.json().catch(() => null);
}

function buildSlackCredentialData(accessToken: string) {
	return {
		accessToken,
		signatureSecret: '',
		notice: ''
	};
}

function asCredentialRecord(value: unknown): N8nCredentialRecord {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('n8n no devolvió una credencial válida.');
	}

	const candidate =
		'value' in (value as Record<string, unknown>) &&
		(value as { value?: unknown }).value &&
		typeof (value as { value?: unknown }).value === 'object'
			? (value as { value: unknown }).value
			: 'data' in (value as Record<string, unknown>) &&
				  (value as { data?: unknown }).data &&
				  typeof (value as { data?: unknown }).data === 'object'
				? (value as { data: unknown }).data
				: value;
	const record = candidate as Partial<N8nCredentialRecord>;

	if (!record.id || !record.name || !record.type) {
		throw new Error('n8n devolvió una credencial incompleta.');
	}

	return record as N8nCredentialRecord;
}
