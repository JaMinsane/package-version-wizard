export type DependencyGroup =
	| 'dependencies'
	| 'devDependencies'
	| 'peerDependencies'
	| 'optionalDependencies';

export type DiffType = 'patch' | 'minor' | 'major' | 'unknown';

export type CallbackStatus = 'completed' | 'failed';

export type AnalysisStatus = 'sending' | 'waiting_callback' | 'completed' | 'failed';

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

export interface AnalysisSnapshot {
	id: string;
	project: ProjectSnapshot;
	status: AnalysisStatus;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
	callbackReceivedAt?: string;
	requestPayload: N8nAnalysisRequest;
	callbackPayload?: N8nAnalysisCallback;
	renderedSummaryHtml?: string;
	errorMessage?: string;
	webhookResponse?: {
		status: number;
		body?: string | null;
	};
	lastIdempotencyKey?: string;
}
