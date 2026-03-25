import { z } from 'zod';

export const registerSchema = z.object({
	name: z
		.string({ required_error: 'El nombre es obligatorio.' })
		.trim()
		.min(1, 'El nombre es obligatorio.')
		.max(100, 'El nombre no puede superar 100 caracteres.'),
	email: z
		.string({ required_error: 'El correo es obligatorio.' })
		.trim()
		.email('Ingresa un correo válido.'),
	password: z
		.string({ required_error: 'La contraseña es obligatoria.' })
		.min(6, 'La contraseña debe tener al menos 6 caracteres.')
		.max(128, 'La contraseña no puede superar 128 caracteres.')
});

export const loginSchema = z.object({
	email: z
		.string({ required_error: 'El correo es obligatorio.' })
		.trim()
		.email('Ingresa un correo válido.'),
	password: z
		.string({ required_error: 'La contraseña es obligatoria.' })
		.min(1, 'La contraseña es obligatoria.')
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
