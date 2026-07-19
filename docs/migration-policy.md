# Database Migration Policy

This project uses Flyway for all database schema and data evolution.

## Naming and placement

- Use versioned migration files with the format: `V<version>__<description>.sql`.
- Place shared migrations in `backend/spring-boot-app/src/main/resources/db/migration/common`.
- Place development-only seed migrations in `backend/spring-boot-app/src/main/resources/db/migration/dev`.
- Keep descriptions short and action-oriented, for example:
  - `V1__create_core_tables.sql`
  - `V3__add_indexes_and_foreign_keys.sql`
  - `V4__add_data_quality_constraints.sql`

## Environment strategy

- Development profiles (`default`, `postgres`) run:
  - `classpath:db/migration/common`
  - `classpath:db/migration/dev`
- Production profile (`prod`) runs only:
  - `classpath:db/migration/common`

This keeps production free from development seed data.

## Rollback strategy

- Prefer forward-only fixes by adding a new migration.
- Do not edit migration files that were already applied in shared environments.
- If a migration causes issues in an environment:
  1. Stop deployment.
  2. Add a corrective migration (new version) to repair schema/data.
  3. Redeploy and verify.

## Migration review checklist

Before merging a migration:

1. Confirm naming/version order is correct.
2. Verify SQL is compatible with both H2 (dev tests) and PostgreSQL (runtime).
3. Ensure constraints/indexes align with domain relationships.
4. Confirm dev seed changes are placed only in `migration/dev`.
5. Run backend tests and verify Flyway applies cleanly on startup.
