import type { AnalysisSnapshot } from '$lib/server/analysis/types';

export type AnalysisDependency = AnalysisSnapshot['dependencies'][number];
export type AnalysisUpgradePhase = NonNullable<AnalysisSnapshot['callbackPayload']>['upgradePlan'][number];
export type AnalysisPackageBrief = NonNullable<AnalysisSnapshot['callbackPayload']>['packageBriefs'][number];
export type AnalysisSource = NonNullable<AnalysisSnapshot['callbackPayload']>['sources'][number];

export type DependencyDisplayStatus =
	| 'outdated'
	| 'covered_by_range'
	| 'up_to_date'
	| 'manual_review';
