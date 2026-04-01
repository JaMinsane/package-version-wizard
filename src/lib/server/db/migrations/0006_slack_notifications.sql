ALTER TABLE projects
	ADD COLUMN IF NOT EXISTS owner_user_id text REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE projects
	DROP CONSTRAINT IF EXISTS projects_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_slug_idx
	ON projects (owner_user_id, slug)
	WHERE owner_user_id IS NOT NULL;

ALTER TABLE analyses
	ADD COLUMN IF NOT EXISTS slack_notification_json jsonb;

CREATE TABLE IF NOT EXISTS slack_workspaces (
	id text PRIMARY KEY,
	slack_team_id text NOT NULL,
	team_name text NOT NULL,
	bot_user_id text,
	scope text,
	bot_access_token_encrypted text NOT NULL,
	installed_by_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	is_active boolean NOT NULL DEFAULT true,
	n8n_credential_id text,
	n8n_credential_name text,
	n8n_sync_status text NOT NULL DEFAULT 'pending'
		CHECK (n8n_sync_status IN ('pending', 'synced', 'failed')),
	n8n_sync_error text,
	last_synced_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_slack_preferences (
	user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	channel_id text,
	channel_name text,
	notify_on_success boolean NOT NULL DEFAULT false,
	notify_on_failure boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_notification_settings (
	project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
	inherit_user_defaults boolean NOT NULL DEFAULT true,
	channel_id text,
	channel_name text,
	notify_on_success boolean NOT NULL DEFAULT false,
	notify_on_failure boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS slack_workspaces_installed_by_idx
	ON slack_workspaces (installed_by_user_id, updated_at DESC);
