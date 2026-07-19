# Branch Strategy

## Branch Model

- main: production-ready code
- develop: integration branch for ongoing work
- feature/*: new functionality
- release/*: stabilization for releases
- hotfix/*: urgent fixes for production

## Workflow

1. Create a feature branch from develop.
2. Implement changes and validate locally.
3. Merge into develop after review.
4. Promote to main through a release branch when ready.
