import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMigrations } from '../../src/lib/server/db/migrate';
import { createDatabaseClient, requireDatabaseUrl } from '../../src/lib/server/db/runtime';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, '../../src/lib/server/db/migrations');

async function main() {
	const databaseUrl = requireDatabaseUrl();
	const db = createDatabaseClient(databaseUrl);

	try {
		const applied = await runMigrations(db, migrationsDir);

		if (applied.length === 0) {
			console.log('No hay migraciones pendientes.');
			return;
		}

		console.log(`Migraciones aplicadas: ${applied.join(', ')}`);
	} finally {
		await db.close();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack ?? error.message : error);
	process.exit(1);
});
