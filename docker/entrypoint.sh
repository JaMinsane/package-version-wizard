#!/bin/sh
set -eu

case "${RUN_DB_MIGRATIONS:-true}" in
	false|FALSE|0|no|NO)
		echo "Skipping database migrations"
		;;
	*)
		echo "Running database migrations"
		bun run db:migrate
		;;
esac

exec bun run start
