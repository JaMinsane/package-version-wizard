import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { createDatabaseClient } from './runtime';

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export interface AppliedMigration {
	version: string;
}

export async function ensureSchemaMigrationsTable(db: DatabaseClient) {
	await db.unsafe(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		);
	`);
}

export async function getPendingMigrationFiles(db: DatabaseClient, migrationsDir: string) {
	await ensureSchemaMigrationsTable(db);

	const files = (await readdir(migrationsDir, { withFileTypes: true }))
		.filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
		.map((entry) => entry.name)
		.sort((left, right) => left.localeCompare(right));

	const appliedRows = (await db<AppliedMigration[]>`
		SELECT version
		FROM schema_migrations
	`) satisfies AppliedMigration[];

	const appliedVersions = new Set(appliedRows.map((row: AppliedMigration) => row.version));

	return files
		.filter((fileName) => !appliedVersions.has(fileName))
		.map((fileName) => path.join(migrationsDir, fileName));
}

export async function runMigrations(db: DatabaseClient, migrationsDir: string) {
	const pendingFiles = await getPendingMigrationFiles(db, migrationsDir);

	for (const filePath of pendingFiles) {
		const sqlText = await Bun.file(filePath).text();
		const version = path.basename(filePath);

		await db.begin(async (tx: DatabaseClient) => {
			await tx.unsafe(sqlText);
			await tx`
				INSERT INTO schema_migrations (version)
				VALUES (${version})
			`;
		});
	}

	return pendingFiles.map((filePath) => path.basename(filePath));
}
