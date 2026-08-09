# Production deployment

- `production/docker-compose.prod.yml` is a single-host production baseline with automatic TLS through Caddy, non-root application images, Docker secrets, health checks, persistent PostgreSQL/Redis data, and restart policies.
- `kubernetes/` is the managed-cloud baseline with two replicas, health probes, resource boundaries, horizontal autoscaling, non-root/read-only containers, and secret-manager integration points.
- Tagged releases build and publish immutable backend/frontend/AI images plus Android AAB and unsigned iOS artifacts through `.github/workflows/release.yml`.

Use a managed PostgreSQL database, managed Redis, private S3 bucket, workload identity, external-secrets operator, ingress/certificate manager, monitoring, and backup service for cloud production. Replace `OWNER`, `VERSION`, domains, and example endpoints during promotion. Never commit rendered secrets.
