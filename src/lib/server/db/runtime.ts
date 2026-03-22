export function requireDatabaseUrl(value = process.env.DATABASE_URL): string {
	if (!value) {
		throw new Error('Falta configurar DATABASE_URL.');
	}

	return value;
}

export function createDatabaseClient(databaseUrl: string) {
	if (typeof Bun === 'undefined' || typeof Bun.SQL !== 'function') {
		throw new Error(
			'La capa de Postgres usa Bun SQL. Ejecuta el servidor con Bun en lugar de node.'
		);
	}

	return new Bun.SQL(databaseUrl);
}
