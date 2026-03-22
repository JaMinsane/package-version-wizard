import semver from 'semver';

import type {
	DependencyDecision,
	DependencySnapshot,
	DependencyStats,
	DiffType,
	ManifestDependencyInput
} from '$lib/server/analysis/types';

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

interface NpmPackageMetadata {
	'dist-tags'?: {
		latest?: string;
	};
	time?: Record<string, string>;
	repository?: string | { url?: string };
	versions?: Record<string, { deprecated?: string }>;
}

export async function enrichManifestDependencies(
	inputs: ManifestDependencyInput[]
): Promise<{ dependencies: DependencySnapshot[]; stats: DependencyStats }> {
	const cache = new Map<string, Promise<NpmPackageMetadata | null>>();
	const dependencies = await mapWithConcurrency(inputs, PACKAGE_ENRICHMENT_CONCURRENCY, async (entry) => {
		let task = cache.get(entry.name);

		if (!task) {
			task = fetchNpmPackageMetadata(entry.name);
			cache.set(entry.name, task);
		}

		const metadata = await task;
		const enriched = enrichDependency(entry, metadata);
		const diffType = inferDiffType(entry.currentVersion, enriched.latestVersion);
		const riskScore = calculateRiskScore({
			latestVersion: enriched.latestVersion,
			currentVersion: entry.currentVersion,
			deprecated: enriched.deprecated,
			diffType,
			group: entry.group,
			name: entry.name
		});

		return {
			...enriched,
			group: entry.group,
			currentVersion: entry.currentVersion,
			diffType,
			riskScore,
			decision: determineDecision({
				currentVersion: entry.currentVersion,
				latestVersion: enriched.latestVersion,
				deprecated: enriched.deprecated,
				diffType,
				riskScore
			})
		} satisfies DependencySnapshot;
	});

	const stats = buildStats(dependencies);

	return {
		dependencies: dependencies.sort(sortDependencies),
		stats
	};
}

function enrichDependency(
	input: ManifestDependencyInput,
	metadata: NpmPackageMetadata | null
): Omit<DependencySnapshot, 'group' | 'currentVersion' | 'diffType' | 'riskScore' | 'decision'> {
	const latestVersion = normalizeLatestVersion(input.currentVersion, metadata?.['dist-tags']?.latest);
	const repositoryUrl = normalizeRepositoryUrl(metadata?.repository);
	const publishedAt = metadata?.time?.[latestVersion];
	const deprecated =
		Boolean(metadata?.versions?.[latestVersion]?.deprecated) ||
		Boolean(getManifestRangeVersion(input.currentVersion) && metadata?.versions?.[getManifestRangeVersion(input.currentVersion) ?? '']?.deprecated);

	return {
		name: input.name,
		latestVersion,
		deprecated,
		publishedAt,
		repositoryUrl,
		sourceUrls: buildSourceUrls(input.name, repositoryUrl)
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
		const outdated = isOutdated(dependency.currentVersion, dependency.latestVersion);

		if (outdated) {
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

function inferDiffType(currentVersion: string, latestVersion: string): DiffType {
	const current = getManifestRangeVersion(currentVersion);

	if (!current || !semver.valid(latestVersion) || !semver.lt(current, latestVersion)) {
		return 'unknown';
	}

	const diff = semver.diff(current, latestVersion);

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
	currentVersion: string;
	latestVersion: string;
	group: ManifestDependencyInput['group'];
	diffType: DiffType;
	deprecated: boolean;
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

	if (!isOutdated(input.currentVersion, input.latestVersion) && !input.deprecated) {
		score = Math.max(score - 15, 0);
	}

	return Math.max(0, Math.min(100, score));
}

function determineDecision(input: {
	currentVersion: string;
	latestVersion: string;
	diffType: DiffType;
	deprecated: boolean;
	riskScore: number;
}): DependencyDecision {
	if (!isOutdated(input.currentVersion, input.latestVersion) && !input.deprecated) {
		return 'hold';
	}

	if (input.deprecated) {
		return 'replace';
	}

	if (input.diffType === 'major' || input.riskScore >= 70) {
		return 'upgrade_now';
	}

	if (input.diffType === 'minor' || input.diffType === 'patch') {
		return 'upgrade_later';
	}

	return 'hold';
}

function getManifestRangeVersion(currentVersion: string) {
	return semver.minVersion(currentVersion)?.version ?? semver.coerce(currentVersion)?.version ?? null;
}

function normalizeLatestVersion(currentVersion: string, latestVersion: string | undefined) {
	if (latestVersion && semver.valid(latestVersion)) {
		return latestVersion;
	}

	return getManifestRangeVersion(currentVersion) ?? currentVersion;
}

function isOutdated(currentVersion: string, latestVersion: string) {
	const current = getManifestRangeVersion(currentVersion);

	return Boolean(current && semver.valid(latestVersion) && semver.lt(current, latestVersion));
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

function sortDependencies(left: DependencySnapshot, right: DependencySnapshot) {
	if (right.riskScore !== left.riskScore) {
		return right.riskScore - left.riskScore;
	}

	if (left.deprecated !== right.deprecated) {
		return Number(right.deprecated) - Number(left.deprecated);
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
