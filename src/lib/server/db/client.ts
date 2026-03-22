import { env } from '$env/dynamic/private';

import { createDatabaseClient } from '$lib/server/db/runtime';

let db: ReturnType<typeof createDatabaseClient> | null = null;

export function getDb() {
	if (!env.DATABASE_URL) {
		throw new Error('Falta configurar DATABASE_URL.');
	}

	db ??= createDatabaseClient(env.DATABASE_URL);

	return db;
}
