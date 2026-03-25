import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { destroySession } from '$lib/server/auth/service';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get('session_token');

		if (token) {
			await destroySession(token);
			cookies.delete('session_token', { path: '/' });
		}

		throw redirect(303, '/');
	}
};
