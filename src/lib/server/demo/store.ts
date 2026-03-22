import { renderMarkdownToSafeHtml } from '$lib/server/markdown';
import type { DemoRunSnapshot, N8nAnalysisCallback, N8nAnalysisRequest } from '$lib/server/demo/types';

interface DemoRunInternal extends DemoRunSnapshot {
	idempotencyKeys: Set<string>;
}

const demoRuns = new Map<string, DemoRunInternal>();

export function createDemoRun(requestPayload: N8nAnalysisRequest): DemoRunSnapshot {
	const run: DemoRunInternal = {
		id: requestPayload.analysisId,
		status: 'sending',
		createdAt: new Date().toISOString(),
		requestPayload,
		idempotencyKeys: new Set<string>()
	};

	demoRuns.set(run.id, run);

	return toSnapshot(run);
}

export function getDemoRun(id: string): DemoRunSnapshot | null {
	const run = demoRuns.get(id);

	return run ? toSnapshot(run) : null;
}

export function markWebhookAccepted(
	id: string,
	webhookResponse: {
		status: number;
		body?: string | null;
	}
): DemoRunSnapshot | null {
	const run = demoRuns.get(id);

	if (!run) {
		return null;
	}

	run.status = 'waiting_callback';
	run.requestSentAt = new Date().toISOString();
	run.webhookResponse = webhookResponse;
	run.errorMessage = undefined;

	return toSnapshot(run);
}

export function markWebhookFailed(id: string, message: string): DemoRunSnapshot | null {
	const run = demoRuns.get(id);

	if (!run) {
		return null;
	}

	run.status = 'failed';
	run.requestSentAt = new Date().toISOString();
	run.errorMessage = message;

	return toSnapshot(run);
}

export function applyN8nCallback(
	idempotencyKey: string,
	payload: N8nAnalysisCallback
):
	| { type: 'applied'; run: DemoRunSnapshot }
	| { type: 'duplicate'; run: DemoRunSnapshot }
	| { type: 'missing' } {
	const run = demoRuns.get(payload.analysisId);

	if (!run) {
		return { type: 'missing' };
	}

	if (
		run.idempotencyKeys.has(idempotencyKey) ||
		run.status === 'completed' ||
		run.status === 'failed'
	) {
		return {
			type: 'duplicate',
			run: toSnapshot(run)
		};
	}

	run.idempotencyKeys.add(idempotencyKey);
	run.lastIdempotencyKey = idempotencyKey;
	run.callbackPayload = payload;
	run.callbackReceivedAt = new Date().toISOString();
	run.renderedSummaryHtml = renderMarkdownToSafeHtml(payload.executiveSummaryMd);
	run.status = payload.status === 'completed' ? 'completed' : 'failed';
	run.errorMessage =
		payload.status === 'failed'
			? payload.executiveSummaryMd || 'n8n devolvió un estado fallido.'
			: undefined;

	return {
		type: 'applied',
		run: toSnapshot(run)
	};
}

function toSnapshot(run: DemoRunInternal): DemoRunSnapshot {
	const { idempotencyKeys: _, ...snapshot } = run;

	return structuredClone(snapshot);
}
