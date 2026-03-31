import type { FlowStep, HeroStat, ReadinessItemDefinition, StoryCard } from '$lib/ui/home/types';

export const homeHeroStats: HeroStat[] = [
	{
		value: '1 upload',
		label: 'Tu package.json, analizado',
		description:
			'Sube el archivo y el servidor se encarga de consultar npm, comparar versiones y generar el reporte.'
	},
	{
		value: '3 capas',
		label: 'Diff, brief y notificación',
		description:
			'Versiones comparadas, resumen AI con prioridades y notificación opcional a Slack en una sola corrida.'
	},
	{
		value: 'URL viva',
		label: 'Compartible al instante',
		description:
			'Cada análisis se persiste con su propia URL. Ábrelo de nuevo, compártelo o envíalo por Slack.'
	}
];

export const homeStoryCards: StoryCard[] = [
	{
		eyebrow: 'Señal clara',
		title: 'Tus dependencias, priorizadas.',
		description:
			'Cada paquete se clasifica por tipo de cambio: major, minor, patch o deprecated. Sabes al tiro qué merece atención.',
		accent: 'cyan'
	},
	{
		eyebrow: 'Brief AI',
		title: 'Un resumen que te dice qué mover primero.',
		description:
			'El brief agrupa los upgrades en fases, indica riesgos y sugiere un orden de ejecución basado en impacto.',
		accent: 'violet'
	},
	{
		eyebrow: 'Slack',
		title: 'El resultado llega a tu canal.',
		description:
			'Si conectas Slack, el brief y el link al análisis se publican automáticamente cuando la corrida termina.',
		accent: 'emerald'
	}
];

export const homeOutputCards: StoryCard[] = [
	{
		eyebrow: 'Resumen',
		title: 'Brief ejecutivo',
		description:
			'Texto claro y directo para producto, plataforma o frontend. Sin jerga innecesaria.',
		accent: 'amber'
	},
	{
		eyebrow: 'Fases',
		title: 'Plan de upgrade por etapas',
		description:
			'Los paquetes se agrupan por impacto para que ejecutes el upgrade en orden y con menos riesgo.',
		accent: 'cyan'
	},
	{
		eyebrow: 'Trazabilidad',
		title: 'Fuentes y evidencia',
		description:
			'Cada recomendación apunta a releases, changelogs o docs. Nada se queda en el aire.',
		accent: 'violet'
	}
];

export const homeFlowSteps: FlowStep[] = [
	{
		index: '01',
		title: 'Sube el archivo',
		description:
			'Selecciona tu package.json. La app lo valida y arranca el análisis en el servidor.',
		detail: 'Formulario nativo, SSR-friendly. Sin pasos extra.'
	},
	{
		index: '02',
		title: 'Se consulta npm',
		description:
			'El servidor compara cada dependencia contra el registry y prepara el contexto para el brief AI.',
		detail: 'Webhook privado + callback firmado. Todo server-side.'
	},
	{
		index: '03',
		title: 'Revisa y comparte',
		description:
			'Abre el análisis, revisa el brief y las dependencias. Si Slack está activo, la notificación sale sola.',
		detail:
			'Deep link incluido en el mensaje de Slack.'
	}
];

export const readinessItemDefinitions: ReadinessItemDefinition[] = [
	{
		key: 'databaseConfigured',
		label: 'Postgres',
		description: '`DATABASE_URL`'
	},
	{
		key: 'webhookConfigured',
		label: 'Webhook n8n',
		description: '`N8N_ANALYSIS_WEBHOOK_URL` + token'
	},
	{
		key: 'callbackConfigured',
		label: 'Callback firmado',
		description: '`N8N_CALLBACK_SECRET`'
	},
	{
		key: 'publicAppConfigured',
		label: 'URL pública',
		description: '`APP_BASE_URL`'
	}
];
