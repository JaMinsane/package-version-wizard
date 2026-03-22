export type DependencyGroup =
	| 'dependencies'
	| 'devDependencies'
	| 'peerDependencies'
	| 'optionalDependencies';

export type DiffType = 'patch' | 'minor' | 'major' | 'unknown';

export type CallbackStatus = 'completed' | 'failed';

export type AnalysisStatus = 'queued' | 'enriching' | 'summarizing' | 'completed' | 'failed';

export type DependencyDecision = 'upgrade_now' | 'upgrade_later' | 'replace' | 'hold';

export type SlackFrequency = 'daily' | 'weekdays' | 'twice_daily';

export interface DependencyStats {
	total: number;
	outdated: number;
	majors: number;
	minors: number;
	patches: number;
	deprecated: number;
}

export interface DependencyCandidate {
	name: string;
	currentVersion: string;
	latestVersion: string;
	group: DependencyGroup;
	diffType: DiffType;
	deprecated: boolean;
	publishedAt?: string;
	repositoryUrl?: string;
	riskScore: number;
}

export interface DependencySnapshot extends DependencyCandidate {
	decision: DependencyDecision;
	sourceUrls: string[];
}

export interface N8nAnalysisRequest {
	analysisId: string;
	projectName: string;
	dependencyStats: {
		total: number;
		outdated: number;
		majors: number;
		deprecated: number;
	};
	candidates: DependencyCandidate[];
}

export interface UpgradePhase {
	wave: number;
	title: string;
	rationale: string;
	packages: string[];
}

export interface PackageBrief {
	name: string;
	summary: string;
	breakingChanges: string[];
	testFocus: string[];
}

export interface SourceLink {
	packageName: string;
	label: string;
	url: string;
}

export interface N8nAnalysisCallback {
	analysisId: string;
	status: CallbackStatus;
	executiveSummaryMd: string;
	upgradePlan: UpgradePhase[];
	packageBriefs: PackageBrief[];
	slackDigestMd?: string;
	sources: SourceLink[];
}

export interface ProjectSnapshot {
	id: string;
	slug: string;
	name: string;
	ecosystem: 'npm';
}

export interface SlackSubscriptionSnapshot {
	channelType: 'slack';
	channelTarget: string;
	frequency: SlackFrequency;
	enabled: boolean;
	updatedAt: string;
}

export interface AnalysisSnapshot {
	id: string;
	project: ProjectSnapshot;
	status: AnalysisStatus;
	manifestName?: string;
	manifestVersion?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
	callbackReceivedAt?: string;
	stats: DependencyStats;
	dependencies: DependencySnapshot[];
	requestPayload: N8nAnalysisRequest;
	callbackPayload?: N8nAnalysisCallback;
	renderedSummaryHtml?: string;
	errorMessage?: string;
	webhookResponse?: {
		status: number;
		body?: string | null;
	};
	lastIdempotencyKey?: string;
	subscription?: SlackSubscriptionSnapshot;
}

export interface PackageJsonManifest {
	name?: string;
	version?: string;
	dependencies?: Record<string, unknown>;
	devDependencies?: Record<string, unknown>;
	peerDependencies?: Record<string, unknown>;
	optionalDependencies?: Record<string, unknown>;
}

export interface ManifestDependencyInput {
	name: string;
	currentVersion: string;
	group: DependencyGroup;
}

export interface ParsedPackageManifest {
	fileName: string;
	manifest: PackageJsonManifest;
	projectName?: string;
	projectVersion?: string;
	dependencies: ManifestDependencyInput[];
}

export interface RadarSubscriptionRecord {
	projectId: string;
	projectName: string;
	projectSlug: string;
	channelType: 'slack';
	channelTarget: string;
	frequency: SlackFrequency;
	latestAnalysisId?: string;
	latestCompletedAnalysisId?: string;
	latestCompletedAnalysisUrl?: string;
}
