# CircleNet-AI Spring Boot Backend

This module contains the initial Spring Boot backend foundation for the CircleNet-AI platform.

## Included areas

- Authentication endpoints
- User management endpoints
- Person endpoints
- Circle endpoints
- Relationship endpoints
- Permission endpoints

## Authentication API

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/revoke`
- `GET /api/auth/health`

`/api/dashboard/**` endpoints now require `Authorization: Bearer <accessToken>`.

## Run locally

```bash
mvn spring-boot:run
```

This starts the backend with the default H2 in-memory database profile.

## Run with PostgreSQL

1. Start infrastructure services from the repository root:

```bash
docker compose up -d postgres
```

2. Start backend with PostgreSQL profile:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```

## Run in production profile (no dev seeds)

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

The PostgreSQL profile reads these environment variables (with defaults):

- POSTGRES_HOST=localhost
- POSTGRES_PORT=5432
- POSTGRES_DB=circlenet_ai
- POSTGRES_USER=circlenet
- POSTGRES_PASSWORD=circlenet123

## Database migrations (Flyway)

The backend now uses Flyway versioned migrations as the canonical database source.

- Shared migrations: src/main/resources/db/migration/common
- Dev seed migrations: src/main/resources/db/migration/dev
- Current migration set:
	- common/V1__create_core_tables.sql
	- dev/V2__seed_initial_data.sql
	- common/V3__add_indexes_and_foreign_keys.sql
	- common/V4__add_data_quality_constraints.sql
	- common/V5__add_auth_tokens_table.sql

Flyway runs automatically on startup for all profiles.

- default and postgres profiles include common + dev migrations.
- prod profile includes only common migrations (no dev seed data).

Legacy script files remain in the repository for reference:

- src/main/resources/db/schema.sql
- src/main/resources/db/data.sql

## Migration policy

See migration naming, rollback strategy, and review checklist in:

- ../../docs/migration-policy.md
