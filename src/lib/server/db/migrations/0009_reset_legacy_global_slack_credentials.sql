UPDATE slack_workspaces
SET
	n8n_credential_id = NULL,
	n8n_credential_name = NULL,
	n8n_sync_status = 'pending',
	n8n_sync_error = 'Reconnect Slack para resincronizar la credencial por workspace en n8n.',
	last_synced_at = NULL,
	updated_at = now()
WHERE n8n_credential_name = 'Package Version Wizard Slack Bot';
