import { getDb } from '$lib/server/db/client';
import type {
	ProjectSlackNotificationSettings,
	SlackPreferenceSettings,
	SlackWorkspaceSnapshot
} from '$lib/server/slack/types';

interface SlackWorkspaceRow {
	id: string;
	slack_team_id: string;
	team_name: string;
	bot_user_id: string | null;
	scope: string | null;
	installed_by_user_id: string;
	is_active: boolean;
	n8n_credential_id: string | null;
	n8n_credential_name: string | null;
	n8n_sync_status: SlackWorkspaceSnapshot['n8nSyncStatus'];
	n8n_sync_error: string | null;
	last_synced_at: Date | string | null;
	created_at: Date | string;
	updated_at: Date | string;
}

interface SlackPreferenceRow {
	enabled: boolean;
	channel_id: string | null;
	channel_name: string | null;
	notify_on_success: boolean;
	notify_on_failure: boolean;
	include_brief: boolean;
	include_top_packages: boolean;
	top_packages_limit: number;
}

interface ProjectPreferenceRow extends SlackPreferenceRow {
	project_id: string;
	inherit_user_defaults: boolean;
}

interface SlackWorkspaceSecretRow {
	id: string;
	bot_access_token_encrypted: string;
}

export const DEFAULT_SLACK_PREFERENCES: SlackPreferenceSettings = {
	enabled: false,
	notifyOnSuccess: true,
	notifyOnFailure: true,
	includeExecutiveBrief: true,
	includeTopPackages: true,
	topPackagesLimit: 3
};

export async function getActiveSlackWorkspace() {
	const db = getDb();
	const rows = await db<SlackWorkspaceRow[]>`
		SELECT
			id,
			slack_team_id,
			team_name,
			bot_user_id,
			scope,
			installed_by_user_id,
			is_active,
			n8n_credential_id,
			n8n_credential_name,
			n8n_sync_status,
			n8n_sync_error,
			last_synced_at,
			created_at,
			updated_at
		FROM slack_workspaces
		WHERE is_active = true
		ORDER BY updated_at DESC
		LIMIT 1
	`;

	return rows[0] ? mapWorkspaceRow(rows[0]) : null;
}

export async function getActiveSlackWorkspaceSecret() {
	const db = getDb();
	const rows = await db<SlackWorkspaceSecretRow[]>`
		SELECT id, bot_access_token_encrypted
		FROM slack_workspaces
		WHERE is_active = true
		ORDER BY updated_at DESC
		LIMIT 1
	`;

	return rows[0]
		? {
				id: rows[0].id,
				encryptedAccessToken: rows[0].bot_access_token_encrypted
			}
		: null;
}

export async function upsertActiveSlackWorkspace(input: {
	id: string;
	slackTeamId: string;
	teamName: string;
	botUserId?: string;
	scope?: string;
	encryptedAccessToken: string;
	installedByUserId: string;
}) {
	const db = getDb();

	await db.begin(async (tx) => {
		await tx`
			UPDATE slack_workspaces
			SET is_active = false, updated_at = now()
			WHERE is_active = true
				AND slack_team_id <> ${input.slackTeamId}
		`;

		await tx`
			INSERT INTO slack_workspaces (
				id,
				slack_team_id,
				team_name,
				bot_user_id,
				scope,
				bot_access_token_encrypted,
				installed_by_user_id,
				is_active,
				n8n_sync_status,
				n8n_sync_error,
				last_synced_at
			)
			VALUES (
				${input.id},
				${input.slackTeamId},
				${input.teamName},
				${input.botUserId ?? null},
				${input.scope ?? null},
				${input.encryptedAccessToken},
				${input.installedByUserId},
				true,
				${'pending'},
				NULL,
				NULL
			)
			ON CONFLICT (slack_team_id)
			DO UPDATE SET
				team_name = EXCLUDED.team_name,
				bot_user_id = EXCLUDED.bot_user_id,
				scope = EXCLUDED.scope,
				bot_access_token_encrypted = EXCLUDED.bot_access_token_encrypted,
				installed_by_user_id = EXCLUDED.installed_by_user_id,
				is_active = true,
				n8n_sync_status = 'pending',
				n8n_sync_error = NULL,
				last_synced_at = NULL,
				updated_at = now()
		`;
	});

	return getActiveSlackWorkspace();
}

export async function updateSlackWorkspaceSyncStatus(input: {
	workspaceId: string;
	status: SlackWorkspaceSnapshot['n8nSyncStatus'];
	credentialId?: string;
	credentialName?: string;
	error?: string;
}) {
	const db = getDb();

	await db`
		UPDATE slack_workspaces
		SET
			n8n_sync_status = ${input.status},
			n8n_credential_id = ${input.credentialId ?? null},
			n8n_credential_name = ${input.credentialName ?? null},
			n8n_sync_error = ${input.error ?? null},
			last_synced_at = ${input.status === 'synced' ? new Date() : null},
			updated_at = now()
		WHERE id = ${input.workspaceId}
	`;
}

export async function getUserSlackPreferences(userId: string): Promise<SlackPreferenceSettings> {
	const db = getDb();
	const rows = await db<SlackPreferenceRow[]>`
		SELECT
			enabled,
			channel_id,
			channel_name,
			notify_on_success,
			notify_on_failure,
			include_brief,
			include_top_packages,
			top_packages_limit
		FROM user_slack_preferences
		WHERE user_id = ${userId}
		LIMIT 1
	`;

	return rows[0] ? mapPreferenceRow(rows[0]) : { ...DEFAULT_SLACK_PREFERENCES };
}

export async function upsertUserSlackPreferences(userId: string, input: SlackPreferenceSettings) {
	const db = getDb();

	await db`
		INSERT INTO user_slack_preferences (
			user_id,
			enabled,
			channel_id,
			channel_name,
			notify_on_success,
			notify_on_failure,
			include_brief,
			include_top_packages,
			top_packages_limit
		)
		VALUES (
			${userId},
			${input.enabled},
			${input.channelId ?? null},
			${input.channelName ?? null},
			${input.notifyOnSuccess},
			${input.notifyOnFailure},
			${input.includeExecutiveBrief},
			${input.includeTopPackages},
			${input.topPackagesLimit}
		)
		ON CONFLICT (user_id)
		DO UPDATE SET
			enabled = EXCLUDED.enabled,
			channel_id = EXCLUDED.channel_id,
			channel_name = EXCLUDED.channel_name,
			notify_on_success = EXCLUDED.notify_on_success,
			notify_on_failure = EXCLUDED.notify_on_failure,
			include_brief = EXCLUDED.include_brief,
			include_top_packages = EXCLUDED.include_top_packages,
			top_packages_limit = EXCLUDED.top_packages_limit,
			updated_at = now()
	`;
}

export async function getProjectSlackSettings(projectId: string) {
	const db = getDb();
	const rows = await db<ProjectPreferenceRow[]>`
		SELECT
			project_id,
			enabled,
			inherit_user_defaults,
			channel_id,
			channel_name,
			notify_on_success,
			notify_on_failure,
			include_brief,
			include_top_packages,
			top_packages_limit
		FROM project_notification_settings
		WHERE project_id = ${projectId}
		LIMIT 1
	`;

	return rows[0] ? mapProjectPreferenceRow(rows[0]) : null;
}

export async function upsertProjectSlackSettings(
	projectId: string,
	input: Omit<ProjectSlackNotificationSettings, 'projectId'>
) {
	const db = getDb();

	await db`
		INSERT INTO project_notification_settings (
			project_id,
			enabled,
			inherit_user_defaults,
			channel_id,
			channel_name,
			notify_on_success,
			notify_on_failure,
			include_brief,
			include_top_packages,
			top_packages_limit
		)
		VALUES (
			${projectId},
			${input.enabled},
			${input.inheritUserDefaults},
			${input.channelId ?? null},
			${input.channelName ?? null},
			${input.notifyOnSuccess},
			${input.notifyOnFailure},
			${input.includeExecutiveBrief},
			${input.includeTopPackages},
			${input.topPackagesLimit}
		)
		ON CONFLICT (project_id)
		DO UPDATE SET
			enabled = EXCLUDED.enabled,
			inherit_user_defaults = EXCLUDED.inherit_user_defaults,
			channel_id = EXCLUDED.channel_id,
			channel_name = EXCLUDED.channel_name,
			notify_on_success = EXCLUDED.notify_on_success,
			notify_on_failure = EXCLUDED.notify_on_failure,
			include_brief = EXCLUDED.include_brief,
			include_top_packages = EXCLUDED.include_top_packages,
			top_packages_limit = EXCLUDED.top_packages_limit,
			updated_at = now()
	`;
}

function mapWorkspaceRow(row: SlackWorkspaceRow): SlackWorkspaceSnapshot {
	return {
		id: row.id,
		teamId: row.slack_team_id,
		teamName: row.team_name,
		botUserId: row.bot_user_id ?? undefined,
		scope: row.scope ?? undefined,
		installedByUserId: row.installed_by_user_id,
		isActive: row.is_active,
		n8nCredentialId: row.n8n_credential_id ?? undefined,
		n8nCredentialName: row.n8n_credential_name ?? undefined,
		n8nSyncStatus: row.n8n_sync_status,
		n8nSyncError: row.n8n_sync_error ?? undefined,
		lastSyncedAt: toOptionalIsoString(row.last_synced_at),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at)
	};
}

function mapPreferenceRow(row: SlackPreferenceRow): SlackPreferenceSettings {
	return {
		enabled: row.enabled,
		channelId: row.channel_id ?? undefined,
		channelName: row.channel_name ?? undefined,
		notifyOnSuccess: row.notify_on_success,
		notifyOnFailure: row.notify_on_failure,
		includeExecutiveBrief: row.include_brief,
		includeTopPackages: row.include_top_packages,
		topPackagesLimit: row.top_packages_limit
	};
}

function mapProjectPreferenceRow(row: ProjectPreferenceRow): ProjectSlackNotificationSettings {
	return {
		projectId: row.project_id,
		inheritUserDefaults: row.inherit_user_defaults,
		...mapPreferenceRow(row)
	};
}

function toIsoString(value: Date | string) {
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toOptionalIsoString(value: Date | string | null) {
	return value ? toIsoString(value) : undefined;
}
