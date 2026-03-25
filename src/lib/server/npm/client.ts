import semver from 'semver';

import type {
	DependencyDecision,
	DependencyResolution,
	DependencySnapshot,
	DependencyStats,
	DiffType,
	ManifestDependencyInput
} from '$lib/server/analysis/types';
import {
	enrichDependency,
	getRegistryPackageName,
	type NpmPackageMetadata
} from '$lib/server/npm/spec-resolution';

const NPM_REGISTRY_BASE_URL = 'https://registry.npmjs.org';
const NPM_REQUEST_TIMEOUT_MS = 8_000;
const PACKAGE_ENRICHMENT_CONCURRENCY = 6;
const CORE_PACKAGES = new Set([
	'svelte',
	'vite',
	'tailwindcss',
	'typescript',
	'eslint',
	'react',
	'vue',
	'next',
	'webpack'
]);

export async function enrichManifestDependencies(
	inputs: ManifestDependencyInput[]
): Promise<{ dependencies: DependencySnapshot[]; stats: DependencyStats }> {
	const cache = new Map<string, Promise<NpmPackageMetadata | null>>();
	const dependencies = await mapWithConcurrency(inputs, PACKAGE_ENRICHMENT_CONCURRENCY, async (entry) => {
		const registryPackageName = getRegistryPackageName(entry);
		let metadataTask: Promise<NpmPackageMetadata | null> | null = null;

		if (registryPackageName) {
			metadataTask = cache.get(registryPackageName) ?? null;

			if (!metadataTask) {
				metadataTask = fetchNpmPackageMetadata(registryPackageName);
				cache.set(registryPackageName, metadataTask);
			}
		}

		const metadata = await (metadataTask ?? Promise.resolve(null));
		const enriched = enrichDependency(entry, metadata);
		const diffType = inferDiffType(enriched.resolution);
		const riskScore = calculateRiskScore({
			name: entry.name,
			group: entry.group,
			diffType,
			deprecated: enriched.deprecated,
			resolution: enriched.resolution
		});

		return {
			...enriched,
			group: entry.group,
			currentVersion: entry.currentVersion,
			diffType,
			riskScore,
			decision: determineDecision({
				diffType,
				deprecated: enriched.deprecated,
				riskScore,
				resolution: enriched.resolution
			})
		} satisfies DependencySnapshot;
	});

	const stats = buildStats(dependencies);

	return {
		dependencies: dependencies.sort(sortDependencies),
		stats
	};
}

async function fetchNpmPackageMetadata(name: string): Promise<NpmPackageMetadata | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), NPM_REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(`${NPM_REGISTRY_BASE_URL}/${encodeURIComponent(name)}`, {
			headers: {
				accept: 'application/json'
			},
			signal: controller.signal
		});

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			throw new Error(`npm registry respondió ${response.status}`);
		}

		return (await response.json()) as NpmPackageMetadata;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

function buildStats(dependencies: DependencySnapshot[]): DependencyStats {
	const stats: DependencyStats = {
		total: dependencies.length,
		outdated: 0,
		majors: 0,
		minors: 0,
		patches: 0,
		deprecated: 0
	};

	for (const dependency of dependencies) {
		if (isOutdated(dependency.resolution)) {
			stats.outdated += 1;
		}

		if (dependency.diffType === 'major') {
			stats.majors += 1;
		}

		if (dependency.diffType === 'minor') {
			stats.minors += 1;
		}

		if (dependency.diffType === 'patch') {
			stats.patches += 1;
		}

		if (dependency.deprecated) {
			stats.deprecated += 1;
		}
	}

	return stats;
}

function inferDiffType(resolution: DependencyResolution): DiffType {
	if (!resolution.wantedVersion || !resolution.latestVersion) {
		return 'unknown';
	}

	if (!semver.lt(resolution.wantedVersion, resolution.latestVersion)) {
		return 'unknown';
	}

	const diff = semver.diff(resolution.wantedVersion, resolution.latestVersion);

	if (diff?.startsWith('major')) {
		return 'major';
	}

	if (diff?.startsWith('minor')) {
		return 'minor';
	}

	if (diff?.startsWith('patch')) {
		return 'patch';
	}

	return 'unknown';
}

function calculateRiskScore(input: {
	name: string;
	group: ManifestDependencyInput['group'];
	diffType: DiffType;
	deprecated: boolean;
	resolution: DependencyResolution;
}) {
	let score = {
		patch: 15,
		minor: 35,
		major: 70,
		unknown: 25
	}[input.diffType];

	if (input.deprecated) {
		score += 25;
	}

	if (input.group === 'dependencies' || input.group === 'peerDependencies') {
		score += 10;
	}

	if (input.group === 'devDependencies') {
		score -= 10;
	}

	if (input.group === 'optionalDependencies') {
		score -= 5;
	}

	if (CORE_PACKAGES.has(input.name)) {
		score += 10;
	}

	if (input.resolution.requiresManualReview) {
		score += 15;
	}

	if (input.resolution.peerOptional) {
		score -= 15;
	}

	if (!isOutdated(input.resolution) && !input.deprecated && !input.resolution.requiresManualReview) {
		score = Math.max(score - 15, 0);
	}

	return Math.max(0, Math.min(100, score));
}

function determineDecision(input: {
	diffType: DiffType;
	deprecated: boolean;
	riskScore: number;
	resolution: DependencyResolution;
}): DependencyDecision {
	if (input.deprecated) {
		return 'replace';
	}

	if (input.resolution.requiresManualReview) {
		return 'hold';
	}

	if (!isOutdated(input.resolution)) {
		return 'hold';
	}

	if (input.diffType === 'major' || input.riskScore >= 70) {
		return 'upgrade_now';
	}

	if (input.diffType === 'minor' || input.diffType === 'patch') {
		return 'upgrade_later';
	}

	return 'hold';
}

function isOutdated(resolution: DependencyResolution) {
	return Boolean(
		resolution.wantedVersion &&
			resolution.latestVersion &&
			semver.lt(resolution.wantedVersion, resolution.latestVersion)
	);
}

function sortDependencies(left: DependencySnapshot, right: DependencySnapshot) {
	if (right.riskScore !== left.riskScore) {
		return right.riskScore - left.riskScore;
	}

	if (left.deprecated !== right.deprecated) {
		return Number(right.deprecated) - Number(left.deprecated);
	}

	if (left.resolution.requiresManualReview !== right.resolution.requiresManualReview) {
		return Number(right.resolution.requiresManualReview) - Number(left.resolution.requiresManualReview);
	}

	return left.name.localeCompare(right.name);
}

async function mapWithConcurrency<T, TResult>(
	items: T[],
	concurrency: number,
	mapper: (item: T, index: number) => Promise<TResult>
) {
	const results = new Array<TResult>(items.length);
	let index = 0;

	const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
		while (index < items.length) {
			const currentIndex = index;
			index += 1;
			results[currentIndex] = await mapper(items[currentIndex], currentIndex);
		}
	});

	await Promise.all(workers);

	return results;
}
