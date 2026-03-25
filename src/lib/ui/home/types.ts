import type { SlackFrequency } from '$lib/server/analysis/types';

export interface EnvironmentReadiness {
	databaseConfigured: boolean;
	webhookConfigured: boolean;
	callbackConfigured: boolean;
	publicAppConfigured: boolean;
	radarConfigured: boolean;
}

export interface HomeFormValues {
	subscribeSlack: boolean;
	slackChannelTarget: string;
	slackFrequency: SlackFrequency;
}

export interface HeroStat {
	value: string;
	label: string;
	description: string;
}

export interface StoryCard {
	eyebrow: string;
	title: string;
	description: string;
	accent: 'cyan' | 'violet' | 'amber' | 'emerald';
}

export interface FlowStep {
	index: string;
	title: string;
	description: string;
	detail: string;
}

export interface ReadinessItemDefinition {
	key: keyof EnvironmentReadiness;
	label: string;
	description: string;
}
