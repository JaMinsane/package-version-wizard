import { z } from 'zod';

export const slackPreferenceSchema = z.object({
	enabled: z.boolean(),
	channelId: z.string().trim().optional(),
	notifyOnSuccess: z.boolean(),
	notifyOnFailure: z.boolean(),
	includeExecutiveBrief: z.boolean(),
	includeTopPackages: z.boolean(),
	topPackagesLimit: z
		.number({ message: 'El límite de highlights debe ser numérico.' })
		.int('El límite de highlights debe ser entero.')
		.min(1, 'El límite mínimo es 1.')
		.max(10, 'El límite máximo es 10.')
});

export const projectSlackPreferenceSchema = slackPreferenceSchema.extend({
	inheritUserDefaults: z.boolean()
});

export type SlackPreferenceInput = z.infer<typeof slackPreferenceSchema>;
export type ProjectSlackPreferenceInput = z.infer<typeof projectSlackPreferenceSchema>;
