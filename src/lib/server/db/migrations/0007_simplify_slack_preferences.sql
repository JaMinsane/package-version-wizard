ALTER TABLE IF EXISTS user_slack_preferences
	ALTER COLUMN notify_on_success SET DEFAULT false;

ALTER TABLE IF EXISTS user_slack_preferences
	ALTER COLUMN notify_on_failure SET DEFAULT false;

ALTER TABLE IF EXISTS project_notification_settings
	ALTER COLUMN notify_on_success SET DEFAULT false;

ALTER TABLE IF EXISTS project_notification_settings
	ALTER COLUMN notify_on_failure SET DEFAULT false;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'user_slack_preferences'
			AND column_name = 'enabled'
	) THEN
		EXECUTE '
			UPDATE user_slack_preferences
			SET
				notify_on_success = false,
				notify_on_failure = false
			WHERE enabled = false
		';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'project_notification_settings'
			AND column_name = 'enabled'
	) THEN
		EXECUTE '
			UPDATE project_notification_settings
			SET
				notify_on_success = false,
				notify_on_failure = false
			WHERE enabled = false
		';
	END IF;
END $$;

ALTER TABLE IF EXISTS user_slack_preferences
	DROP COLUMN IF EXISTS enabled,
	DROP COLUMN IF EXISTS include_brief,
	DROP COLUMN IF EXISTS include_top_packages,
	DROP COLUMN IF EXISTS top_packages_limit;

ALTER TABLE IF EXISTS project_notification_settings
	DROP COLUMN IF EXISTS enabled,
	DROP COLUMN IF EXISTS include_brief,
	DROP COLUMN IF EXISTS include_top_packages,
	DROP COLUMN IF EXISTS top_packages_limit;
