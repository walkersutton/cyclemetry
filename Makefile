.PHONY: help build up down logs clean dev restart lint format check

help:
	@echo "Cyclemetry Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment with hot-reload"
	@echo "  make logs         - View logs from all services"
	@echo "  make logs-backend - View backend logs only"
	@echo "  make logs-frontend- View frontend logs only"
	@echo ""
	@echo "Code Quality:"
	@echo "  make format       - Auto-format all code (Python + JS)"
	@echo "  make lint         - Run linters on all code"
	@echo "  make check        - Run all checks (CI-ready)"
	@echo ""
	@echo "Maintenance:"
	@echo "  make build        - Rebuild Docker images"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make clean        - Remove containers, volumes, and images"
	@echo "  make ps           - Show running containers"
	@echo "  make stats        - Show container resource usage"

dev:
	docker compose up

build:
	docker compose build --no-cache

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

restart:
	docker compose restart

clean:
	docker compose down -v
	docker system prune -f

ps:
	docker compose ps

stats:
	docker stats

# Code Quality
lint:
	@echo "🔍 Running linters..."
	@echo "Checking Python code with ruff..."
	cd backend && uv run ruff check .
	@echo "Checking frontend formatting with prettier..."
	cd app && npx prettier --check "src/**/*.{js,jsx,json,css}" --log-level warn || true

format:
	@echo "✨ Formatting code..."
	@echo "Formatting Python with ruff..."
	cd backend && uv run ruff format .
	@echo "Formatting frontend with prettier..."
	cd app && npx prettier --write "src/**/*.{js,jsx,json,css}" --log-level warn

check:
	@echo "🔎 Running all checks..."
	@echo "1. Formatting check..."
	cd backend && uv run ruff format --check .
	@echo "2. Linting..."
	cd backend && uv run ruff check .
	@echo "3. Frontend formatting check..."
	cd app && npx prettier --check "src/**/*.{js,jsx,json,css}" --log-level warn || true
	@echo "✅ All checks passed!"
