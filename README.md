# CircleNet-AI

CircleNet-AI is an enterprise-grade platform architecture for AI-native collaboration, identity, and knowledge workflows. This repository establishes the initial foundation for the platform and is structured to support future frontend, backend, infrastructure, and AI modules.

## Milestone 1: Foundation Repository

This milestone delivers the core repository scaffolding for a production-ready engineering workflow:

- Repository metadata and licensing
- Standardized editor and Git configuration
- Container-based local development environment
- CI workflow for validation and consistency
- Initial module directories for future implementation

## Repository Structure

- [docs](docs)
- [frontend](frontend)
- [backend](backend)
- [database](database)
- [deployment](deployment)
- [infrastructure](infrastructure)
- [mobile](mobile)
- [ai](ai)
- [testing](testing)
- [tools](tools)

## Technology Baseline

- Java 21 LTS
- Spring Boot 3.x
- Next.js 15
- React 19
- TypeScript
- PostgreSQL 17
- Redis
- Docker
- Node.js 22 LTS

## Quick Start

1. Review the repository structure.
2. Start local infrastructure services:
   - `docker compose up -d`
3. Use the development helpers:
   - `make help`

## Development Commands

- `make help` - Show common commands
- `make docker-up` - Start local infrastructure services
- `make docker-down` - Stop local infrastructure services
- `make ci` - Run repository validation steps
- `make ai-install` - Install AI service dependencies
- `make ai-run` - Run AI service locally
- `make ai-test` - Run AI service test suite
- `make mobile-get` - Install Flutter mobile dependencies
- `make mobile-test` - Run Flutter mobile tests

## Milestone 6: Mobile Foundation

Milestone 6 starts with an initial Flutter module under `mobile/flutter-app`.

Current capabilities:

- Flutter app scaffold with Material 3 baseline theme
- Auth flow screens for Sign In and Sign Up
- API client integration with backend auth health and user registration contracts
- JWT login and refresh integration with local mobile session persistence
- Logout and token revocation integration
- Authenticated mobile dashboard summary call using bearer access token
- Baseline widget test for app rendering

## Milestone 7: Web Authenticated Dashboard

Milestone 7 secures the Next.js dashboard with backend JWT session flows.

Current capabilities:

- Web sign-in page integrated with `POST /api/auth/login`
- Browser session persistence for access and refresh tokens
- Automatic token refresh fallback via `POST /api/auth/refresh`
- Authenticated dashboard API calls using bearer access tokens
- Web logout flow integrated with `POST /api/auth/logout`

## Milestone 8: Web Session Bootstrap Experience

Milestone 8 improves public-to-authenticated flow on the Next.js web app.

Current capabilities:

- Landing page always remains available without login
- Public auth service health check integration via `GET /api/auth/health`
- Session-aware landing behavior that enriches workspace data for signed-in users
- Sign-out action available directly from the landing navigation
- Consistent authenticated handoff to dashboard workflows

## Milestone 9: Session Identity Introspection

Milestone 9 adds authenticated user identity introspection for web clients.

Current capabilities:

- Backend `GET /api/auth/me` endpoint for access-token session profile retrieval
- Bearer-protected auth-me path via JWT security filter and security chain rules
- Frontend session profile client integration for landing and dashboard experiences
- Signed-in identity context displayed in web navigation surfaces

## Milestone 10: Web Session Control Center

Milestone 10 adds first-class web session lifecycle controls and observability.

Current capabilities:

- Dedicated session control page at `/session`
- Live session identity and token lifetime visibility for signed-in users
- Manual access token refresh workflow using `POST /api/auth/refresh`
- Explicit session revocation workflow using `POST /api/auth/revoke`
- Unified navigation entry points to session controls from landing and dashboard pages

## Milestone 5: AI Module Foundation

Milestone 5 starts with an initial AI service module under `ai/agent-service`.

Current capabilities:

- FastAPI service scaffold with health endpoints
- Versioned API namespace (`/api/v1`)
- Strongly typed request/response models
- Config-driven behavior via environment variables
- Test baseline for service health checks

## Quality Standards

This repository is intended to support the following standards from the start:

- Consistent formatting
- Repeatable local development
- Container-based dependency management
- CI validation
- Clear documentation and scaffolding
