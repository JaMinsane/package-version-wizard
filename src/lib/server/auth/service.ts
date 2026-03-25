import { getDb } from '$lib/server/db/client';
import type { AuthUser, AuthSession, RegisterInput, LoginInput } from './types';
import { registerSchema, loginSchema } from './validation';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function createSessionToken(): string {
	return crypto.randomUUID();
}

function createUserId(): string {
	return crypto.randomUUID();
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerUser(raw: RegisterInput): Promise<{ user: AuthUser; token: string }> {
	const data = registerSchema.parse(raw);
	const db = getDb();

	// Check if email already exists
	const existing = await db`
		SELECT id FROM users WHERE LOWER(email) = LOWER(${data.email}) LIMIT 1
	`;

	if (existing.length > 0) {
		throw new Error('Ya existe una cuenta con ese correo.');
	}

	const userId = createUserId();
	const passwordHash = await Bun.password.hash(data.password, {
		algorithm: 'bcrypt',
		cost: 10
	});

	await db`
		INSERT INTO users (id, name, email, password_hash)
		VALUES (${userId}, ${data.name}, ${data.email.toLowerCase()}, ${passwordHash})
	`;

	const token = createSessionToken();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await db`
		INSERT INTO sessions (id, user_id, expires_at)
		VALUES (${token}, ${userId}, ${expiresAt})
	`;

	return {
		user: {
			id: userId,
			name: data.name,
			email: data.email.toLowerCase(),
			createdAt: new Date()
		},
		token
	};
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function loginUser(raw: LoginInput): Promise<{ user: AuthUser; token: string }> {
	const data = loginSchema.parse(raw);
	const db = getDb();

	const rows = await db`
		SELECT id, name, email, password_hash, created_at
		FROM users
		WHERE LOWER(email) = LOWER(${data.email})
		LIMIT 1
	`;

	if (rows.length === 0) {
		throw new Error('Credenciales inválidas.');
	}

	const row = rows[0] as {
		id: string;
		name: string;
		email: string;
		password_hash: string;
		created_at: Date;
	};

	const validPassword = await Bun.password.verify(data.password, row.password_hash);

	if (!validPassword) {
		throw new Error('Credenciales inválidas.');
	}

	const token = createSessionToken();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await db`
		INSERT INTO sessions (id, user_id, expires_at)
		VALUES (${token}, ${row.id}, ${expiresAt})
	`;

	return {
		user: {
			id: row.id,
			name: row.name,
			email: row.email,
			createdAt: row.created_at
		},
		token
	};
}

// ─── Session lookup ──────────────────────────────────────────────────────────

export async function getUserBySession(token: string): Promise<AuthUser | null> {
	const db = getDb();

	const rows = await db`
		SELECT u.id, u.name, u.email, u.created_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.id = ${token}
		  AND s.expires_at > now()
		LIMIT 1
	`;

	if (rows.length === 0) {
		return null;
	}

	const row = rows[0] as { id: string; name: string; email: string; created_at: Date };

	return {
		id: row.id,
		name: row.name,
		email: row.email,
		createdAt: row.created_at
	};
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function destroySession(token: string): Promise<void> {
	const db = getDb();
	await db`DELETE FROM sessions WHERE id = ${token}`;
}
