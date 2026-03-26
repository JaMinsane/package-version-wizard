import type { FlowStep, HeroStat, ReadinessItemDefinition, StoryCard } from '$lib/ui/home/types';

export const homeHeroStats: HeroStat[] = [
	{
		value: '1 upload',
		label: 'Manifiesto listo para analizar',
		description:
			'El flujo parte de un `package.json` real y mantiene el procesamiento del lado del servidor.'
	},
	{
		value: '3 capas',
		label: 'Diff, resumen y ejecución',
		description:
			'Registry, brief y plan de acción quedan alineados en una misma corrida persistida.'
	},
	{
		value: 'URL viva',
		label: 'Resultado compartible',
		description:
			'El análisis se guarda, se puede volver a abrir y deja listo el deep link para Slack.'
	}
];

export const homeStoryCards: StoryCard[] = [
	{
		eyebrow: 'Señal inmediata',
		title: 'Las dependencias dejan de ser una lista plana.',
		description:
			'El manifiesto se convierte en un mapa priorizado con cambios major, rangos que ya resuelven la latest y paquetes que merecen revisión real.',
		accent: 'cyan'
	},
	{
		eyebrow: 'Resultado operativo',
		title: 'El brief aterriza qué mover primero.',
		description:
			'Las fases de upgrade y el contexto por paquete llegan listas para orientar pruebas, coordinación y riesgo técnico.',
		accent: 'violet'
	},
	{
		eyebrow: 'Notificación final',
		title: 'El resultado también puede aterrizar en Slack.',
		description:
			'El brief ejecutivo y el enlace al análisis completo llegan al canal configurado cuando la corrida termina.',
		accent: 'emerald'
	}
];

export const homeOutputCards: StoryCard[] = [
	{
		eyebrow: 'Resumen',
		title: 'Brief ejecutivo sanitizado',
		description:
			'Un bloque legible para producto, plataforma y frontend, con lenguaje claro y orientado a ejecución.',
		accent: 'amber'
	},
	{
		eyebrow: 'Fases',
		title: 'Waves accionables',
		description:
			'Los paquetes se agrupan por impacto para reducir fricción al momento de ejecutar el upgrade.',
		accent: 'cyan'
	},
	{
		eyebrow: 'Trazabilidad',
		title: 'Fuentes y evidencia',
		description:
			'Cada recomendación puede rastrearse hasta releases, changelogs y documentación relevante.',
		accent: 'violet'
	}
];

export const homeFlowSteps: FlowStep[] = [
	{
		index: '01',
		title: 'Sube el manifiesto',
		description:
			'El punto de entrada sigue siendo un formulario nativo, rápido y compatible con SSR.',
		detail: 'La app valida el archivo, preserva el estado del formulario y prepara la corrida.'
	},
	{
		index: '02',
		title: 'Resuelve el árbol',
		description:
			'El servidor consulta npm, normaliza versiones declaradas y deja la corrida lista para enriquecimiento externo.',
		detail: 'El webhook privado y el callback firmado mantienen el procesamiento fuera del cliente.'
	},
	{
		index: '03',
		title: 'Revisa y notifica',
		description:
			'La vista de análisis consolida brief, dependencias críticas, evidencia y la configuración Slack por proyecto.',
		detail:
			'Si Slack está activo, n8n envía la notificación final al canal elegido con deep link incluido.'
	}
];

export const readinessItemDefinitions: ReadinessItemDefinition[] = [
	{
		key: 'databaseConfigured',
		label: 'Postgres persistido',
		description: '`DATABASE_URL`'
	},
	{
		key: 'webhookConfigured',
		label: 'Webhook privado de n8n',
		description: '`N8N_ANALYSIS_WEBHOOK_URL` + token'
	},
	{
		key: 'callbackConfigured',
		label: 'Callback firmado',
		description: '`N8N_CALLBACK_SECRET`'
	},
	{
		key: 'publicAppConfigured',
		label: 'Links públicos',
		description: '`APP_BASE_URL`'
	}
];
