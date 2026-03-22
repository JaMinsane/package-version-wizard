import type {
	ManifestDependencyInput,
	PackageJsonManifest,
	ParsedPackageManifest
} from '$lib/server/analysis/types';

const MAX_PACKAGE_JSON_BYTES = 1_048_576;
const DEPENDENCY_GROUPS = [
	'dependencies',
	'devDependencies',
	'peerDependencies',
	'optionalDependencies'
] as const;

export async function parseUploadedPackageJson(file: File): Promise<ParsedPackageManifest> {
	if (!(file instanceof File) || file.size === 0) {
		throw new Error('Selecciona un archivo package.json para continuar.');
	}

	if (file.size > MAX_PACKAGE_JSON_BYTES) {
		throw new Error('El package.json supera el límite de 1 MB permitido para esta demo.');
	}

	if (!looksLikeJsonFile(file)) {
		throw new Error('Sube un archivo JSON válido. El flujo espera un package.json.');
	}

	return parsePackageJsonText(await file.text(), file.name || 'package.json');
}

export function parsePackageJsonText(text: string, fileName = 'package.json'): ParsedPackageManifest {
	let parsed: unknown;

	try {
		parsed = JSON.parse(text) as unknown;
	} catch {
		throw new Error('El archivo no contiene JSON válido.');
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('El package.json debe ser un objeto JSON válido.');
	}

	const manifest = parsed as PackageJsonManifest;
	const dependencies = normalizeManifestDependencies(manifest);

	if (dependencies.length === 0) {
		throw new Error('El package.json no contiene dependencias compatibles para analizar.');
	}

	return {
		fileName,
		manifest,
		projectName: asOptionalString(manifest.name),
		projectVersion: asOptionalString(manifest.version),
		dependencies
	};
}

function normalizeManifestDependencies(manifest: PackageJsonManifest): ManifestDependencyInput[] {
	const entries: ManifestDependencyInput[] = [];

	for (const group of DEPENDENCY_GROUPS) {
		const value = manifest[group];

		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			continue;
		}

		for (const [name, rawVersion] of Object.entries(value)) {
			if (!name.trim() || typeof rawVersion !== 'string' || !rawVersion.trim()) {
				continue;
			}

			entries.push({
				name: name.trim(),
				currentVersion: rawVersion.trim(),
				group
			});
		}
	}

	return entries;
}

function looksLikeJsonFile(file: File) {
	const fileName = file.name.toLowerCase();
	const type = file.type.toLowerCase();

	return (
		fileName.endsWith('.json') ||
		fileName === 'package.json' ||
		type.includes('json') ||
		type === ''
	);
}

function asOptionalString(value: unknown) {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();

	return normalized ? normalized : undefined;
}
