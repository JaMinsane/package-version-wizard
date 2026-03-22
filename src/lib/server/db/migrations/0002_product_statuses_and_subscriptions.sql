ALTER TABLE analyses
	DROP CONSTRAINT IF EXISTS analyses_status_check;

UPDATE analyses
SET status = 'queued'
WHERE status = 'sending';

UPDATE analyses
SET status = 'summarizing'
WHERE status = 'waiting_callback';

ALTER TABLE analyses
	ADD CONSTRAINT analyses_status_check
	CHECK (status IN ('queued', 'enriching', 'summarizing', 'completed', 'failed'));

UPDATE automation_subscriptions
SET channel_type = 'slack',
	frequency = CASE
		WHEN frequency IN ('daily', 'weekdays', 'twice_daily') THEN frequency
		ELSE 'daily'
	END,
	updated_at = now();

ALTER TABLE automation_subscriptions
	DROP CONSTRAINT IF EXISTS automation_subscriptions_channel_type_check;

ALTER TABLE automation_subscriptions
	ADD CONSTRAINT automation_subscriptions_channel_type_check
	CHECK (channel_type = 'slack');

ALTER TABLE automation_subscriptions
	DROP CONSTRAINT IF EXISTS automation_subscriptions_frequency_check;

ALTER TABLE automation_subscriptions
	ADD CONSTRAINT automation_subscriptions_frequency_check
	CHECK (frequency IN ('daily', 'weekdays', 'twice_daily'));

CREATE INDEX IF NOT EXISTS automation_subscriptions_active_idx
	ON automation_subscriptions (project_id, updated_at DESC)
	WHERE enabled = true;
