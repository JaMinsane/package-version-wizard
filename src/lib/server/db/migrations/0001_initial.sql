CREATE TABLE IF NOT EXISTS projects (
	id text PRIMARY KEY,
	slug text NOT NULL UNIQUE,
	name text NOT NULL,
	ecosystem text NOT NULL DEFAULT 'npm' CHECK (ecosystem = 'npm'),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analyses (
	id text PRIMARY KEY,
	project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	status text NOT NULL CHECK (status IN ('sending', 'waiting_callback', 'completed', 'failed')),
	manifest_name text,
	manifest_json jsonb,
	stats_json jsonb NOT NULL,
	request_payload_json jsonb NOT NULL,
	callback_payload_json jsonb,
	summary_markdown text,
	summary_html text,
	upgrade_plan_json jsonb NOT NULL DEFAULT '[]'::jsonb,
	package_briefs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
	sources_json jsonb NOT NULL DEFAULT '[]'::jsonb,
	slack_digest_markdown text,
	webhook_response_json jsonb,
	error_message text,
	n8n_execution_id text,
	last_idempotency_key text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS analysis_dependencies (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	analysis_id text NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
	name text NOT NULL,
	dependency_group text NOT NULL CHECK (
		dependency_group IN ('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')
	),
	current_version text NOT NULL,
	latest_version text NOT NULL,
	diff_type text NOT NULL CHECK (diff_type IN ('patch', 'minor', 'major', 'unknown')),
	deprecated boolean NOT NULL DEFAULT false,
	published_at timestamptz,
	repository_url text,
	risk_score integer NOT NULL,
	decision text CHECK (decision IN ('upgrade_now', 'upgrade_later', 'replace', 'hold')),
	source_urls_json jsonb NOT NULL DEFAULT '[]'::jsonb,
	CONSTRAINT analysis_dependencies_unique UNIQUE (analysis_id, name, dependency_group)
);

CREATE TABLE IF NOT EXISTS automation_subscriptions (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	channel_type text NOT NULL,
	channel_target text NOT NULL,
	enabled boolean NOT NULL DEFAULT true,
	frequency text NOT NULL,
	last_sent_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT automation_subscriptions_unique UNIQUE (project_id, channel_type, channel_target)
);

CREATE TABLE IF NOT EXISTS analysis_callback_receipts (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	analysis_id text NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
	idempotency_key text NOT NULL UNIQUE,
	received_at timestamptz NOT NULL DEFAULT now(),
	payload_hash text
);

CREATE INDEX IF NOT EXISTS analyses_project_created_idx
	ON analyses (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS analyses_status_idx
	ON analyses (status);

CREATE INDEX IF NOT EXISTS analysis_dependencies_analysis_idx
	ON analysis_dependencies (analysis_id);

CREATE INDEX IF NOT EXISTS automation_subscriptions_project_idx
	ON automation_subscriptions (project_id);
