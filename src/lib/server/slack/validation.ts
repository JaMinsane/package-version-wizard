import { z } from 'zod';

export const slackPreferenceSchema = z.object({
	channelId: z.string().trim().optional(),
	notifyOnSuccess: z.boolean(),
	notifyOnFailure: z.boolean()
});

export const projectSlackPreferenceSchema = slackPreferenceSchema.extend({
	inheritUserDefaults: z.boolean()
});

export type SlackPreferenceInput = z.infer<typeof slackPreferenceSchema>;
export type ProjectSlackPreferenceInput = z.infer<typeof projectSlackPreferenceSchema>;
