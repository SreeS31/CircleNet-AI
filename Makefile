.PHONY: help docker-up docker-down ci

help:
	@echo "CircleNet-AI development commands"
	@echo "  make docker-up      Start local infrastructure"
	@echo "  make docker-down    Stop local infrastructure"
	@echo "  make ci             Run validation steps"

docker-up:
	docker compose up -d

docker-down:
	docker compose down

ci:
	@echo "Repository validation placeholder"
	@echo "Add lint, test, and build commands here as modules are introduced"
