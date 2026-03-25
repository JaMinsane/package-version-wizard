import type { Handle } from '@sveltejs/kit';
import { getUserBySession } from '$lib/server/auth/service';

const SESSION_COOKIE = 'session_token';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		try {
			const user = await getUserBySession(token);

			if (user) {
				event.locals.user = user;
			} else {
				// Session expired or invalid — clear the cookie
				event.cookies.delete(SESSION_COOKIE, { path: '/' });
			}
		} catch {
			// DB unavailable — don't block the request
		}
	}

	return resolve(event);
};
