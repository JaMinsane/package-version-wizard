import { env } from '$env/dynamic/private';

import type { SlackChannelOption } from '$lib/server/slack/types';

const SLACK_API_BASE_URL = 'https://slack.com/api';

interface SlackOAuthResponse {
	ok: boolean;
	error?: string;
	access_token?: string;
	scope?: string;
	bot_user_id?: string;
	team?: {
		id?: string;
		name?: string;
	};
}

interface SlackChannelListResponse {
	ok: boolean;
	error?: string;
	channels?: Array<{
		id?: string;
		name?: string;
		is_private?: boolean;
		is_member?: boolean;
		is_archived?: boolean;
	}>;
	response_metadata?: {
		next_cursor?: string;
	};
}

export function getSlackInstallRedirectUri(appBaseUrl: string) {
	return `${appBaseUrl}/settings/integrations/slack/callback`;
}

export function buildSlackInstallUrl(input: { appBaseUrl: string; state: string }) {
	const clientId = env.SLACK_CLIENT_ID?.trim();

	if (!clientId) {
		throw new Error('Falta configurar SLACK_CLIENT_ID.');
	}

	const redirectUri = getSlackInstallRedirectUri(input.appBaseUrl);
	const url = new URL('https://slack.com/oauth/v2/authorize');

	url.searchParams.set('client_id', clientId);
	url.searchParams.set(
		'scope',
		['channels:read', 'groups:read', 'chat:write', 'chat:write.public'].join(',')
	);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('state', input.state);

	return url.toString();
}

export async function exchangeSlackOAuthCode(input: { code: string; appBaseUrl: string }) {
	const clientId = env.SLACK_CLIENT_ID?.trim();
	const clientSecret = env.SLACK_CLIENT_SECRET?.trim();

	if (!clientId) {
		throw new Error('Falta configurar SLACK_CLIENT_ID.');
	}

	if (!clientSecret) {
		throw new Error('Falta configurar SLACK_CLIENT_SECRET.');
	}

	const redirectUri = getSlackInstallRedirectUri(input.appBaseUrl);
	const response = await fetch(`${SLACK_API_BASE_URL}/oauth.v2.access`, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			code: input.code,
			redirect_uri: redirectUri
		})
	});

	const payload = (await response.json()) as SlackOAuthResponse;

	if (
		!response.ok ||
		!payload.ok ||
		!payload.access_token ||
		!payload.team?.id ||
		!payload.team.name
	) {
		throw new Error(
			`Slack no pudo completar la instalación${payload.error ? `: ${payload.error}` : '.'}`
		);
	}

	return {
		teamId: payload.team.id,
		teamName: payload.team.name,
		accessToken: payload.access_token,
		scope: payload.scope,
		botUserId: payload.bot_user_id
	};
}

export async function listSlackChannels(accessToken: string): Promise<SlackChannelOption[]> {
	const channels: SlackChannelOption[] = [];
	let cursor = '';

	while (true) {
		const url = new URL(`${SLACK_API_BASE_URL}/conversations.list`);
		url.searchParams.set('exclude_archived', 'true');
		url.searchParams.set('limit', '200');
		url.searchParams.set('types', 'public_channel,private_channel');

		if (cursor) {
			url.searchParams.set('cursor', cursor);
		}

		const response = await fetch(url, {
			headers: {
				authorization: `Bearer ${accessToken}`
			}
		});
		const payload = (await response.json()) as SlackChannelListResponse;

		if (!response.ok || !payload.ok) {
			throw new Error(
				`No se pudieron cargar los canales de Slack${payload.error ? `: ${payload.error}` : '.'}`
			);
		}

		for (const channel of payload.channels ?? []) {
			if (!channel.id || !channel.name || channel.is_archived) {
				continue;
			}

			channels.push({
				id: channel.id,
				name: channel.name,
				isPrivate: Boolean(channel.is_private),
				isMember: Boolean(channel.is_member)
			});
		}

		cursor = payload.response_metadata?.next_cursor?.trim() ?? '';

		if (!cursor) {
			break;
		}
	}

	return channels.sort((left, right) => left.name.localeCompare(right.name, 'es'));
}
