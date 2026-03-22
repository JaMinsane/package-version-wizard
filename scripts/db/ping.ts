import { requireDatabaseUrl, createDatabaseClient } from '../../src/lib/server/db/runtime';

async function main() {
	const databaseUrl = requireDatabaseUrl();
	const db = createDatabaseClient(databaseUrl);

	try {
		const [row] = await db<{
			database: string;
			user_name: string;
			current_time: string;
			server_version: string;
		}[]>`
			SELECT
				current_database() AS database,
				current_user AS user_name,
				now()::text AS current_time,
				version() AS server_version
		`;

		console.log(`database: ${row.database}`);
		console.log(`user: ${row.user_name}`);
		console.log(`time: ${row.current_time}`);
		console.log(`version: ${row.server_version.split(',')[0]}`);
	} finally {
		await db.close();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.stack ?? error.message : error);
	process.exit(1);
});
