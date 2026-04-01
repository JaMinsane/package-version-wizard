WITH ranked_workspaces AS (
	SELECT
		id,
		ROW_NUMBER() OVER (
			PARTITION BY installed_by_user_id
			ORDER BY is_active DESC, updated_at DESC, created_at DESC, id DESC
		) AS rank_in_user
	FROM slack_workspaces
)
UPDATE slack_workspaces sw
SET
	is_active = ranked_workspaces.rank_in_user = 1,
	updated_at = now()
FROM ranked_workspaces
WHERE ranked_workspaces.id = sw.id;

ALTER TABLE IF EXISTS slack_workspaces
	DROP CONSTRAINT IF EXISTS slack_workspaces_slack_team_id_key;

DROP INDEX IF EXISTS slack_workspaces_single_active_idx;

CREATE UNIQUE INDEX IF NOT EXISTS slack_workspaces_user_team_idx
	ON slack_workspaces (installed_by_user_id, slack_team_id);

CREATE UNIQUE INDEX IF NOT EXISTS slack_workspaces_user_active_idx
	ON slack_workspaces (installed_by_user_id)
	WHERE is_active = true;
