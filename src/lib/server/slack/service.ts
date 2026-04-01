import { env } from '$env/dynamic/private';

import { getAppBaseUrl } from '$lib/server/app-url';
import { getOptionalTrimmedString, formDataHasCheckedValue } from '$lib/server/forms';
import {
	buildSlackInstallUrl,
	exchangeSlackOAuthCode,
	listSlackChannels
} from '$lib/server/slack/client';
import { decryptSlackToken, encryptSlackToken } from '$lib/server/slack/crypto';
import { syncManagedSlackCredential } from '$lib/server/slack/n8n';
import {
	clearSlackPreferenceData,
	clearSlackWorkspaceInstallation,
	DEFAULT_SLACK_PREFERENCES,
	getActiveSlackWorkspace,
	getActiveSlackWorkspaceSecret,
	getProjectSlackSettings,
	getUserSlackPreferences,
	updateSlackWorkspaceSyncStatus,
	upsertActiveSlackWorkspace,
	upsertProjectSlackSettings,
	upsertUserSlackPreferences
} from '$lib/server/slack/repository';
import type {
	AnalysisSlackPanelData,
	ProjectSlackNotificationSettings,
	SlackChannelOption,
	SlackNotificationContext,
	SlackPreferenceSettings,
	SlackSettingsPageData
} from '$lib/server/slack/types';
import { projectSlackPreferenceSchema, slackPreferenceSchema } from '$lib/server/slack/validation';

const SLACK_OAUTH_STATE_COOKIE = 'slack_oauth_state';

export function isSlackInstallConfigured() {
	return Boolean(
		env.SLACK_CLIENT_ID?.trim() &&
		env.SLACK_CLIENT_SECRET?.trim() &&
		env.SLACK_INSTALLATION_ENCRYPTION_KEY?.trim() &&
		getAppBaseUrl()
	);
}

export function getSlackOAuthStateCookieName() {
	return SLACK_OAUTH_STATE_COOKIE;
}

export function createSlackOAuthStateCookieValue(input: { state: string; userId: string }) {
	return JSON.stringify(input);
}

export function parseSlackOAuthStateCookieValue(value?: string | null) {
	if (!value) {
		return null;
	}

	try {
		const parsed = JSON.parse(value) as { state?: unknown; userId?: unknown };

		if (typeof parsed.state !== 'string' || typeof parsed.userId !== 'string') {
			return null;
		}

		return {
			state: parsed.state,
			userId: parsed.userId
		};
	} catch {
		return null;
	}
}

export function createSlackInstallUrl() {
	const appBaseUrl = getAppBaseUrl();

	if (!appBaseUrl) {
		throw new Error('Falta configurar APP_BASE_URL.');
	}

	const state = crypto.randomUUID();

	return {
		state,
		url: buildSlackInstallUrl({
			appBaseUrl,
			state
		})
	};
}

export async function completeSlackInstallation(input: { code: string; userId: string }) {
	const appBaseUrl = getAppBaseUrl();

	if (!appBaseUrl) {
		throw new Error('Falta configurar APP_BASE_URL.');
	}

	const installation = await exchangeSlackOAuthCode({
		code: input.code,
		appBaseUrl
	});
	const previousWorkspace = await getActiveSlackWorkspace(input.userId);

	const workspace = await upsertActiveSlackWorkspace({
		id: `slack_workspace_${crypto.randomUUID()}`,
		slackTeamId: installation.teamId,
		teamName: installation.teamName,
		botUserId: installation.botUserId,
		scope: installation.scope,
		encryptedAccessToken: encryptSlackToken(installation.accessToken),
		installedByUserId: input.userId
	});

	if (!workspace) {
		throw new Error('No se pudo persistir la instalación de Slack.');
	}

	if (previousWorkspace && previousWorkspace.teamId !== installation.teamId) {
		await clearSlackPreferenceData(input.userId);
	}

	try {
		const synced = await syncManagedSlackCredential(installation.accessToken);

		await updateSlackWorkspaceSyncStatus({
			workspaceId: workspace.id,
			status: 'synced',
			credentialId: synced.credentialId,
			credentialName: synced.credentialName
		});
	} catch (error) {
		await updateSlackWorkspaceSyncStatus({
			workspaceId: workspace.id,
			status: 'failed',
			error:
				error instanceof Error
					? error.message
					: 'No se pudo sincronizar la credencial administrada de Slack con n8n.'
		});
	}

	return getActiveSlackWorkspace(input.userId);
}

export async function disconnectSlackWorkspace(userId: string) {
	const workspace = await getActiveSlackWorkspace(userId);

	if (!workspace) {
		throw new Error('No hay un workspace de Slack conectado.');
	}

	await clearSlackWorkspaceInstallation(userId);
}

export async function getSlackSettingsPageData(userId: string): Promise<SlackSettingsPageData> {
	const [workspace, defaults, channels] = await Promise.all([
		getActiveSlackWorkspace(userId),
		getUserSlackPreferences(userId),
		getSlackChannelsForWorkspaceSafe(userId)
	]);

	return {
		workspace: workspace ?? undefined,
		channels,
		defaults,
		installReady: isSlackInstallConfigured()
	};
}

export async function getAnalysisSlackPanelData(input: {
	viewerUserId?: string;
	projectOwnerUserId?: string;
	projectId: string;
}): Promise<AnalysisSlackPanelData> {
	const canManage = Boolean(
		input.viewerUserId &&
		input.projectOwnerUserId &&
		input.viewerUserId === input.projectOwnerUserId
	);

	if (!canManage || !input.viewerUserId) {
		return {
			canManage: false,
			installReady: isSlackInstallConfigured(),
			channels: []
		};
	}

	const [workspace, channels, userDefaults, projectSettings] = await Promise.all([
		getActiveSlackWorkspace(input.viewerUserId),
		getSlackChannelsForWorkspaceSafe(input.viewerUserId),
		getUserSlackPreferences(input.viewerUserId),
		getProjectSlackSettings(input.projectId)
	]);

	return {
		canManage: true,
		installReady: isSlackInstallConfigured(),
		workspace: workspace ?? undefined,
		channels,
		userDefaults,
		projectSettings,
		effectiveSettings: resolveEffectiveSlackSettings(userDefaults, projectSettings)
	};
}

export async function saveUserSlackPreferencesFromForm(userId: string, formData: FormData) {
	const parsed = slackPreferenceSchema.parse({
		channelId: getOptionalTrimmedString(formData, 'channelId'),
		notifyOnSuccess: formDataHasCheckedValue(formData, 'notifyOnSuccess'),
		notifyOnFailure: formDataHasCheckedValue(formData, 'notifyOnFailure')
	});
	const channels = await getSlackChannelsForWorkspace(userId);
	const channel = validateChannelSelection(
		parsed.notifyOnSuccess || parsed.notifyOnFailure,
		parsed.channelId,
		channels
	);

	await upsertUserSlackPreferences(userId, {
		channelId: channel?.id,
		channelName: channel?.name,
		notifyOnSuccess: parsed.notifyOnSuccess,
		notifyOnFailure: parsed.notifyOnFailure
	});
}

export async function saveProjectSlackSettingsFromForm(input: {
	projectId: string;
	userId: string;
	formData: FormData;
}) {
	const parsed = projectSlackPreferenceSchema.parse({
		inheritUserDefaults: formDataHasCheckedValue(input.formData, 'inheritUserDefaults'),
		channelId: getOptionalTrimmedString(input.formData, 'channelId'),
		notifyOnSuccess: formDataHasCheckedValue(input.formData, 'notifyOnSuccess'),
		notifyOnFailure: formDataHasCheckedValue(input.formData, 'notifyOnFailure')
	});
	const channels = await getSlackChannelsForWorkspace(input.userId);
	const channel = parsed.inheritUserDefaults
		? undefined
		: validateChannelSelection(
				parsed.notifyOnSuccess || parsed.notifyOnFailure,
				parsed.channelId,
				channels
			);

	await upsertProjectSlackSettings(input.projectId, {
		inheritUserDefaults: parsed.inheritUserDefaults,
		channelId: channel?.id,
		channelName: channel?.name,
		notifyOnSuccess: parsed.notifyOnSuccess,
		notifyOnFailure: parsed.notifyOnFailure
	});
}

export async function resolveSlackNotificationContext(input: {
	projectId: string;
	requestedByUserId: string;
	requestedByUserName: string;
}): Promise<SlackNotificationContext> {
	const workspace = await getActiveSlackWorkspace(input.requestedByUserId);

	if (!workspace) {
		return {
			workspaceInstalled: false,
			requestedByUserId: input.requestedByUserId,
			requestedByUserName: input.requestedByUserName,
			reason: 'slack_not_installed',
			...DEFAULT_SLACK_PREFERENCES
		};
	}

	if (workspace.n8nSyncStatus !== 'synced') {
		return {
			workspaceInstalled: true,
			requestedByUserId: input.requestedByUserId,
			requestedByUserName: input.requestedByUserName,
			reason: 'slack_workspace_not_synced',
			...DEFAULT_SLACK_PREFERENCES
		};
	}

	const [userDefaults, projectSettings] = await Promise.all([
		getUserSlackPreferences(input.requestedByUserId),
		getProjectSlackSettings(input.projectId)
	]);
	const effective = resolveEffectiveSlackSettings(userDefaults, projectSettings);

	if (isSlackNotificationPaused(effective)) {
		return {
			workspaceInstalled: true,
			workspaceId: workspace.id,
			workspaceTeamId: workspace.teamId,
			requestedByUserId: input.requestedByUserId,
			requestedByUserName: input.requestedByUserName,
			reason: 'notifications_paused',
			...effective
		};
	}

	if (!effective.channelId) {
		return {
			workspaceInstalled: true,
			workspaceId: workspace.id,
			workspaceTeamId: workspace.teamId,
			requestedByUserId: input.requestedByUserId,
			requestedByUserName: input.requestedByUserName,
			reason: 'missing_channel',
			...effective
		};
	}

	return {
		workspaceInstalled: true,
		workspaceId: workspace.id,
		workspaceTeamId: workspace.teamId,
		requestedByUserId: input.requestedByUserId,
		requestedByUserName: input.requestedByUserName,
		...effective
	};
}

export function resolveEffectiveSlackSettings(
	userDefaults: SlackPreferenceSettings,
	projectSettings?: ProjectSlackNotificationSettings | null
): SlackPreferenceSettings {
	if (!projectSettings || projectSettings.inheritUserDefaults) {
		return { ...userDefaults };
	}

	return {
		channelId: projectSettings.channelId,
		channelName: projectSettings.channelName,
		notifyOnSuccess: projectSettings.notifyOnSuccess,
		notifyOnFailure: projectSettings.notifyOnFailure
	};
}

async function getSlackChannelsForWorkspace(userId: string): Promise<SlackChannelOption[]> {
	const workspaceSecret = await getActiveSlackWorkspaceSecret(userId);

	if (!workspaceSecret) {
		return [];
	}

	return listSlackChannels(decryptSlackToken(workspaceSecret.encryptedAccessToken));
}

async function getSlackChannelsForWorkspaceSafe(userId: string) {
	try {
		return await getSlackChannelsForWorkspace(userId);
	} catch {
		return [];
	}
}

function validateChannelSelection(
	shouldNotify: boolean,
	channelId: string | undefined,
	channels: SlackChannelOption[]
) {
	if (!shouldNotify) {
		return channelId ? channels.find((channel) => channel.id === channelId) : undefined;
	}

	if (!channelId) {
		throw new Error('Selecciona un canal de Slack para poder enviar notificaciones.');
	}

	const channel = channels.find((entry) => entry.id === channelId);

	if (!channel) {
		throw new Error(
			'Selecciona un canal visible para el bot. Si el canal es privado, invita primero al bot de Slack.'
		);
	}

	return channel;
}

function isSlackNotificationPaused(settings: SlackPreferenceSettings) {
	return !settings.notifyOnSuccess && !settings.notifyOnFailure;
}
