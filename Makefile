.PHONY: help build start stop restart logs backup restore clean status shell

# Default target
help:
	@echo "Tournament Manager Docker Commands"
	@echo ""
	@echo "make build    - Build Docker image"
	@echo "make start    - Start services"
	@echo "make stop     - Stop services"
	@echo "make restart  - Restart services"
	@echo "make logs     - View logs"
	@echo "make backup   - Create data backup"
	@echo "make restore  - Restore from backup"
	@echo "make clean    - Remove all containers and volumes"
	@echo "make status   - Show container status"
	@echo "make shell    - Open shell in container"

# Build Docker image
build:
	docker-compose build --no-cache

# Start services
start:
	docker-compose up -d
	@echo "Tournament Manager is running at http://localhost:3001"

# Stop services
stop:
	docker-compose down

# Restart services
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs -f tournament-manager

# Create backup
backup:
	@mkdir -p backups
	@docker run --rm \
		-v tournament-manager-2-opus_tournament-data:/data \
		-v $(PWD)/backups:/backups \
		alpine tar -czf /backups/tournament-data-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "Backup created in backups/"

# Restore from backup
restore:
	@echo "Available backups:"
	@ls -la backups/*.tar.gz 2>/dev/null || echo "No backups found"
	@echo ""
	@read -p "Enter backup filename: " backup; \
	if [ -f "backups/$$backup" ]; then \
		docker-compose down && \
		docker run --rm \
			-v tournament-manager-2-opus_tournament-data:/data \
			-v $(PWD)/backups:/backups \
			alpine sh -c "rm -rf /data/* && tar -xzf /backups/$$backup -C /data" && \
		docker-compose up -d && \
		echo "Restore complete!"; \
	else \
		echo "Backup file not found!"; \
	fi

# Clean everything
clean:
	@echo "WARNING: This will remove all data!"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker-compose down -v --rmi all; \
	fi

# Show status
status:
	@docker-compose ps
	@echo ""
	@docker volume inspect tournament-manager-2-opus_tournament-data | grep -E "CreatedAt|Mountpoint" || true

# Open shell in container
shell:
	docker-compose exec tournament-manager sh
