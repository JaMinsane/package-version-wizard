import npa from 'npm-package-arg';
import semver from 'semver';

import type {
	DependencyDeprecationStatus,
	DependencyResolution,
	DependencySpecKind,
	ManifestDependencyInput
} from '$lib/server/analysis/types';

export interface NpmPackageMetadata {
	'dist-tags'?: Record<string, string | undefined>;
	time?: Record<string, string>;
	repository?: string | { url?: string };
	versions?: Record<string, { deprecated?: string }>;
	readme?: string;
}

interface PreparedDependencySpec {
	declaredSpec: string;
	specKind: DependencySpecKind;
	registryPackageName?: string;
	rangeSpec?: string;
	tagName?: string;
	requiresManualReview: boolean;
}

export interface DependencyEnrichment {
	name: string;
	latestVersion: string;
	deprecated: boolean;
	publishedAt?: string;
	repositoryUrl?: string;
	sourceUrls: string[];
	resolution: DependencyResolution;
}

export function getRegistryPackageName(input: ManifestDependencyInput) {
	return prepareDependencySpec(input).registryPackageName ?? null;
}

export function enrichDependency(
	input: ManifestDependencyInput,
	metadata: NpmPackageMetadata | null
): DependencyEnrichment {
	const prepared = prepareDependencySpec(input);
	const resolution = resolveDependencyResolution(input, prepared, metadata);
	const latestVersion = resolution.latestVersion ?? resolution.wantedVersion ?? input.currentVersion;
	const publishedAt = resolution.latestVersion
		? metadata?.time?.[resolution.latestVersion]
		: resolution.wantedVersion
			? metadata?.time?.[resolution.wantedVersion]
			: undefined;
	const repositoryUrl = normalizeRepositoryUrl(metadata?.repository);
	const sourceUrls = buildSourceUrls(prepared.registryPackageName ?? input.name, repositoryUrl);

	return {
		name: input.name,
		latestVersion,
		deprecated: isConfirmedDeprecated(resolution.deprecationStatus),
		publishedAt,
		repositoryUrl,
		sourceUrls,
		resolution
	};
}

function prepareDependencySpec(input: ManifestDependencyInput): PreparedDependencySpec {
	const declaredSpec = input.currentVersion.trim();

	if (!declaredSpec || declaredSpec.startsWith('workspace:')) {
		return {
			declaredSpec,
			specKind: 'workspace',
			requiresManualReview: true
		};
	}

	try {
		const parsed = npa.resolve(input.name, declaredSpec, process.cwd());

		if (parsed.type === 'range' || parsed.type === 'version') {
			return {
				declaredSpec,
				specKind: 'semver',
				registryPackageName: parsed.name ?? input.name,
				rangeSpec: parsed.fetchSpec ?? declaredSpec,
				requiresManualReview: false
			};
		}

		if (parsed.type === 'tag') {
			const tagName = parsed.fetchSpec ?? declaredSpec;

			return {
				declaredSpec,
				specKind: 'dist_tag',
				registryPackageName: parsed.name ?? input.name,
				tagName,
				requiresManualReview: tagName !== 'latest'
			};
		}

		if (parsed.type === 'alias' && parsed.subSpec?.registry && parsed.subSpec.name) {
			if (parsed.subSpec.type === 'range' || parsed.subSpec.type === 'version') {
				return {
					declaredSpec,
					specKind: 'alias',
					registryPackageName: parsed.subSpec.name,
					rangeSpec: parsed.subSpec.fetchSpec ?? declaredSpec,
					requiresManualReview: false
				};
			}

			if (parsed.subSpec.type === 'tag') {
				const tagName = parsed.subSpec.fetchSpec ?? declaredSpec;

				return {
					declaredSpec,
					specKind: 'alias',
					registryPackageName: parsed.subSpec.name,
					tagName,
					requiresManualReview: tagName !== 'latest'
				};
			}
		}

		if (parsed.type === 'git') {
			return {
				declaredSpec,
				specKind: isGitHubShortcut(parsed.rawSpec, parsed.hosted?.type)
					? 'github'
					: 'git',
				requiresManualReview: true
			};
		}

		if (parsed.type === 'remote') {
			return {
				declaredSpec,
				specKind: 'tarball',
				requiresManualReview: true
			};
		}

		if (parsed.type === 'file' || parsed.type === 'directory') {
			return {
				declaredSpec,
				specKind: 'file',
				requiresManualReview: true
			};
		}
	} catch {
		return {
			declaredSpec,
			specKind: 'unknown',
			requiresManualReview: true
		};
	}

	return {
		declaredSpec,
		specKind: 'unknown',
		requiresManualReview: true
	};
}

function resolveDependencyResolution(
	input: ManifestDependencyInput,
	prepared: PreparedDependencySpec,
	metadata: NpmPackageMetadata | null
): DependencyResolution {
	const base: DependencyResolution = {
		declaredSpec: prepared.declaredSpec,
		specKind: prepared.specKind,
		registryPackageName: prepared.registryPackageName,
		comparisonStatus: 'unresolved',
		requiresManualReview: prepared.requiresManualReview,
		deprecationStatus: prepared.specKind === 'unknown' ? 'unsupported' : 'unresolved',
		peerOptional: input.peerOptional
	};

	if (!prepared.registryPackageName) {
		return {
			...base,
			comparisonStatus:
				prepared.specKind === 'unknown' ? 'unsupported' : 'manual_review',
			deprecationStatus:
				prepared.specKind === 'unknown' ? 'unsupported' : 'unsupported',
			requiresManualReview: true
		};
	}

	if (!metadata) {
		return {
			...base,
			comparisonStatus: 'unresolved',
			deprecationStatus: 'unresolved',
			requiresManualReview: true
		};
	}

	const versions = getValidVersions(metadata);
	const latestVersion = getTagVersion(metadata, 'latest');
	const latestSatisfiesRange =
		prepared.rangeSpec != null &&
		latestVersion != null &&
		semver.satisfies(latestVersion, prepared.rangeSpec);
	const wantedVersion =
		prepared.tagName != null
			? getTagVersion(metadata, prepared.tagName)
			: prepared.rangeSpec
				? latestSatisfiesRange
					? latestVersion
					: semver.maxSatisfying(versions, prepared.rangeSpec) ?? undefined
				: undefined;
	const satisfiableVersions =
		prepared.rangeSpec != null
			? latestSatisfiesRange && wantedVersion
				? [wantedVersion]
				: versions.filter((version) => semver.satisfies(version, prepared.rangeSpec!))
			: wantedVersion
				? [wantedVersion]
				: [];
	const deprecatedVersions = satisfiableVersions.filter((version) => Boolean(metadata.versions?.[version]?.deprecated));
	const latestDeprecated = latestVersion ? Boolean(metadata.versions?.[latestVersion]?.deprecated) : false;
	const wantedDeprecated = wantedVersion ? Boolean(metadata.versions?.[wantedVersion]?.deprecated) : false;
	const rangeLike = prepared.rangeSpec != null && satisfiableVersions.length > 1;
	const preferredDeprecatedVersion =
		pickPreferredDeprecatedVersion({
			wantedVersion,
			latestVersion,
			deprecatedVersions,
			latestDeprecated
		}) ?? undefined;
	const deprecationStatus = resolveDeprecationStatus({
		rangeLike,
		satisfiableVersions,
		deprecatedVersions,
		wantedDeprecated,
		latestDeprecated
	});
	const deprecationMessage =
		preferredDeprecatedVersion != null
			? metadata.versions?.[preferredDeprecatedVersion]?.deprecated
			: undefined;
	const comparisonStatus = resolveComparisonStatus({
		specKind: prepared.specKind,
		tagName: prepared.tagName,
		wantedVersion,
		latestVersion
	});

	return {
		...base,
		wantedVersion,
		latestVersion,
		comparisonStatus,
		requiresManualReview:
			base.requiresManualReview ||
			comparisonStatus === 'manual_review' ||
			comparisonStatus === 'unsupported' ||
			comparisonStatus === 'unresolved' ||
			comparisonStatus === 'channel_pinned' ||
			deprecationStatus === 'range_partially_deprecated' ||
			deprecationStatus === 'unresolved' ||
			deprecationStatus === 'unsupported',
		deprecationStatus,
		deprecationMessage,
		deprecationSourceVersion: preferredDeprecatedVersion
	};
}

function resolveComparisonStatus(input: {
	specKind: DependencySpecKind;
	tagName?: string;
	wantedVersion?: string;
	latestVersion?: string;
}): DependencyResolution['comparisonStatus'] {
	if (input.specKind === 'unknown') {
		return 'unsupported';
	}

	if (['git', 'github', 'tarball', 'file', 'workspace'].includes(input.specKind)) {
		return 'manual_review';
	}

	if (!input.wantedVersion || !input.latestVersion) {
		return 'unresolved';
	}

	if (input.specKind === 'dist_tag' && input.tagName && input.tagName !== 'latest') {
		return 'channel_pinned';
	}

	if (semver.lt(input.wantedVersion, input.latestVersion)) {
		return 'outdated';
	}

	return 'up_to_date';
}

function resolveDeprecationStatus(input: {
	rangeLike: boolean;
	satisfiableVersions: string[];
	deprecatedVersions: string[];
	wantedDeprecated: boolean;
	latestDeprecated: boolean;
}): DependencyDeprecationStatus {
	if (input.satisfiableVersions.length === 0) {
		return 'unresolved';
	}

	if (input.rangeLike && input.deprecatedVersions.length === input.satisfiableVersions.length) {
		return 'range_fully_deprecated';
	}

	if (input.wantedDeprecated) {
		return 'wanted_deprecated';
	}

	if (input.latestDeprecated) {
		return 'latest_deprecated';
	}

	if (input.rangeLike && input.deprecatedVersions.length > 0) {
		return 'range_partially_deprecated';
	}

	return 'none';
}

function pickPreferredDeprecatedVersion(input: {
	wantedVersion?: string;
	latestVersion?: string;
	deprecatedVersions: string[];
	latestDeprecated: boolean;
}) {
	if (input.wantedVersion && input.deprecatedVersions.includes(input.wantedVersion)) {
		return input.wantedVersion;
	}

	if (input.latestDeprecated && input.latestVersion) {
		return input.latestVersion;
	}

	if (input.deprecatedVersions.length === 0) {
		return null;
	}

	return semver.rsort([...input.deprecatedVersions])[0] ?? null;
}

function getValidVersions(metadata: NpmPackageMetadata | null) {
	return Object.keys(metadata?.versions ?? {}).filter((version) => Boolean(semver.valid(version)));
}

function getTagVersion(metadata: NpmPackageMetadata | null, tagName: string) {
	const version = metadata?.['dist-tags']?.[tagName];

	return version && semver.valid(version) ? version : undefined;
}

function isGitHubShortcut(rawSpec: string, hostedType?: string) {
	if (hostedType !== 'github') {
		return false;
	}

	return rawSpec.startsWith('github:') || /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#.+)?$/.test(rawSpec);
}

function normalizeRepositoryUrl(value: NpmPackageMetadata['repository']) {
	const raw = typeof value === 'string' ? value : value?.url;

	if (!raw) {
		return undefined;
	}

	return raw
		.replace(/^git\+/, '')
		.replace(/\.git$/i, '')
		.replace(/^git:\/\//, 'https://');
}

function buildSourceUrls(name: string, repositoryUrl?: string) {
	const urls = [`https://www.npmjs.com/package/${name}`];

	if (repositoryUrl) {
		urls.push(repositoryUrl);
	}

	return urls;
}

function isConfirmedDeprecated(status: DependencyDeprecationStatus) {
	return (
		status === 'wanted_deprecated' ||
		status === 'latest_deprecated' ||
		status === 'range_fully_deprecated'
	);
}
