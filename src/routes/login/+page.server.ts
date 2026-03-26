import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';

import type { Actions, PageServerLoad } from './$types';
import { registerUser, loginUser } from '$lib/server/auth/service';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/upload');
	}

	return {};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		try {
			const { token } = await loginUser({ email, password });

			cookies.set('session_token', token, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 7 // 7 days
			});
		} catch (error) {
			if (error instanceof ZodError) {
				return fail(400, {
					action: 'login' as const,
					message: (error as ZodError).issues?.[0]?.message ?? 'Datos inválidos.',
					values: { email }
				});
			}

			return fail(400, {
				action: 'login' as const,
				message: error instanceof Error ? error.message : 'Error al iniciar sesión.',
				values: { email }
			});
		}

		throw redirect(303, '/upload');
	},

	register: async ({ request, cookies }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		try {
			const { token } = await registerUser({ name, email, password });

			cookies.set('session_token', token, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 7
			});
		} catch (error) {
			if (error instanceof ZodError) {
				return fail(400, {
					action: 'register' as const,
					message: (error as ZodError).issues?.[0]?.message ?? 'Datos inválidos.',
					values: { name, email }
				});
			}

			return fail(400, {
				action: 'register' as const,
				message: error instanceof Error ? error.message : 'Error al crear la cuenta.',
				values: { name, email }
			});
		}

		throw redirect(303, '/upload');
	}
};
