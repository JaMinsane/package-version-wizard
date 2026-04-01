export type SlackNotificationDeliveryStatus = 'sent' | 'skipped' | 'failed';

export interface SlackChannelOption {
	id: string;
	name: string;
	isPrivate: boolean;
	isMember: boolean;
}

export interface SlackPreferenceSettings {
	channelId?: string;
	channelName?: string;
	notifyOnSuccess: boolean;
	notifyOnFailure: boolean;
}

export interface ProjectSlackNotificationSettings extends SlackPreferenceSettings {
	projectId: string;
	inheritUserDefaults: boolean;
}

export interface SlackWorkspaceSnapshot {
	id: string;
	teamId: string;
	teamName: string;
	botUserId?: string;
	scope?: string;
	installedByUserId: string;
	isActive: boolean;
	n8nCredentialId?: string;
	n8nCredentialName?: string;
	n8nSyncStatus: 'pending' | 'synced' | 'failed';
	n8nSyncError?: string;
	lastSyncedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface SlackNotificationContext extends SlackPreferenceSettings {
	workspaceInstalled: boolean;
	workspaceId?: string;
	workspaceTeamId?: string;
	requestedByUserId: string;
	requestedByUserName: string;
	reason?: string;
}

export interface SlackNotificationResult {
	attempted: boolean;
	status: SlackNotificationDeliveryStatus;
	channelId?: string;
	channelName?: string;
	reason?: string;
	notifiedAt?: string;
}

export interface SlackSettingsPageData {
	workspace?: SlackWorkspaceSnapshot;
	channels: SlackChannelOption[];
	defaults: SlackPreferenceSettings;
	installReady: boolean;
}

export interface AnalysisSlackPanelData {
	canManage: boolean;
	installReady: boolean;
	workspace?: SlackWorkspaceSnapshot;
	channels: SlackChannelOption[];
	userDefaults?: SlackPreferenceSettings;
	projectSettings?: ProjectSlackNotificationSettings | null;
	effectiveSettings?: SlackPreferenceSettings;
}
