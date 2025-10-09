.PHONY: help build up down logs clean dev prod restart

help:
	@echo "Cyclemetry Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment with hot-reload"
	@echo "  make logs         - View logs from all services"
	@echo "  make logs-backend - View backend logs only"
	@echo "  make logs-frontend- View frontend logs only"
	@echo ""
	@echo "Production:"
	@echo "  make build        - Build all Docker images"
	@echo "  make up           - Start production services"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make prod         - Build and start production"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Remove containers, volumes, and images"
	@echo "  make ps           - Show running containers"
	@echo "  make stats        - Show container resource usage"

dev:
	docker-compose -f docker-compose.dev.yml up

build:
	docker-compose build --no-cache

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

restart:
	docker-compose restart

prod: build up
	@echo "Production services started"
	@echo "Frontend: http://localhost"
	@echo "Backend: http://localhost:3001"

clean:
	docker-compose down -v
	docker system prune -f

ps:
	docker-compose ps

stats:
	docker stats
