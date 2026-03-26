export interface EnvironmentReadiness {
	databaseConfigured: boolean;
	webhookConfigured: boolean;
	callbackConfigured: boolean;
	publicAppConfigured: boolean;
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
