ALTER TABLE analysis_dependencies
	ADD COLUMN IF NOT EXISTS resolution_json jsonb;
