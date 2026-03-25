export interface AuthUser {
	id: string;
	name: string;
	email: string;
	createdAt: Date;
}

export interface AuthSession {
	id: string;
	userId: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface RegisterInput {
	name: string;
	email: string;
	password: string;
}

export interface LoginInput {
	email: string;
	password: string;
}
