import { randomUUID } from 'node:crypto';

import type { N8nAnalysisRequest } from '$lib/server/demo/types';

export function buildDemoAnalysisRequest(): N8nAnalysisRequest {
	return {
		analysisId: `demo_${randomUUID()}`,
		projectName: 'Package Version Wizard Demo',
		dependencyStats: {
			total: 18,
			outdated: 8,
			majors: 3,
			deprecated: 1
		},
		candidates: [
			{
				name: 'svelte',
				currentVersion: '4.2.18',
				latestVersion: '5.0.0',
				group: 'dependencies',
				diffType: 'major',
				deprecated: false,
				publishedAt: '2024-10-19T00:00:00.000Z',
				repositoryUrl: 'https://github.com/sveltejs/svelte',
				riskScore: 93
			},
			{
				name: 'vite',
				currentVersion: '5.4.10',
				latestVersion: '6.1.0',
				group: 'devDependencies',
				diffType: 'major',
				deprecated: false,
				publishedAt: '2025-01-09T00:00:00.000Z',
				repositoryUrl: 'https://github.com/vitejs/vite',
				riskScore: 81
			},
			{
				name: 'tailwindcss',
				currentVersion: '3.4.15',
				latestVersion: '4.0.0',
				group: 'devDependencies',
				diffType: 'major',
				deprecated: false,
				publishedAt: '2025-01-22T00:00:00.000Z',
				repositoryUrl: 'https://github.com/tailwindlabs/tailwindcss',
				riskScore: 84
			},
			{
				name: 'eslint',
				currentVersion: '9.14.0',
				latestVersion: '9.18.0',
				group: 'devDependencies',
				diffType: 'minor',
				deprecated: false,
				publishedAt: '2025-02-05T00:00:00.000Z',
				repositoryUrl: 'https://github.com/eslint/eslint',
				riskScore: 41
			},
			{
				name: 'request',
				currentVersion: '2.88.2',
				latestVersion: '2.88.2',
				group: 'dependencies',
				diffType: 'unknown',
				deprecated: true,
				publishedAt: '2020-02-11T00:00:00.000Z',
				repositoryUrl: 'https://github.com/request/request',
				riskScore: 76
			},
			{
				name: 'typescript',
				currentVersion: '5.6.3',
				latestVersion: '5.8.2',
				group: 'devDependencies',
				diffType: 'minor',
				deprecated: false,
				publishedAt: '2025-02-27T00:00:00.000Z',
				repositoryUrl: 'https://github.com/microsoft/TypeScript',
				riskScore: 36
			}
		]
	};
}
