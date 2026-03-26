import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { env } from '$env/dynamic/private';

const IV_LENGTH = 12;

function getEncryptionKey() {
	const secret = env.SLACK_INSTALLATION_ENCRYPTION_KEY?.trim();

	if (!secret) {
		throw new Error('Falta configurar SLACK_INSTALLATION_ENCRYPTION_KEY.');
	}

	return createHash('sha256').update(secret).digest();
}

export function encryptSlackToken(value: string) {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
	const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();

	return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSlackToken(payload: string) {
	const [ivBase64, tagBase64, encryptedBase64] = payload.split(':');

	if (!ivBase64 || !tagBase64 || !encryptedBase64) {
		throw new Error('El token cifrado de Slack no tiene un formato válido.');
	}

	const decipher = createDecipheriv(
		'aes-256-gcm',
		getEncryptionKey(),
		Buffer.from(ivBase64, 'base64')
	);
	decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encryptedBase64, 'base64')),
		decipher.final()
	]);

	return decrypted.toString('utf8');
}
