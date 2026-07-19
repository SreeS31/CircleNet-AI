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

## Quality Standards

This repository is intended to support the following standards from the start:

- Consistent formatting
- Repeatable local development
- Container-based dependency management
- CI validation
- Clear documentation and scaffolding
