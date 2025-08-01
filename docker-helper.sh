#!/bin/bash

# Docker deployment and management scripts

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Tournament Manager Docker Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       - Start the tournament manager"
    echo "  stop        - Stop the tournament manager"
    echo "  restart     - Restart the tournament manager"
    echo "  build       - Build the Docker image"
    echo "  logs        - Show logs"
    echo "  backup      - Create a manual backup"
    echo "  restore     - Restore from a backup"
    echo "  clean       - Remove containers and images"
    echo "  status      - Show container status"
    echo ""
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
}

# Start services
start_services() {
    echo -e "${GREEN}Starting Tournament Manager...${NC}"
    docker-compose up -d
    echo -e "${GREEN}Tournament Manager started! Access at http://localhost:3001${NC}"
}

# Stop services
stop_services() {
    echo -e "${YELLOW}Stopping Tournament Manager...${NC}"
    docker-compose down
    echo -e "${GREEN}Tournament Manager stopped.${NC}"
}

# Restart services
restart_services() {
    stop_services
    start_services
}

# Build image
build_image() {
    echo -e "${GREEN}Building Tournament Manager image...${NC}"
    docker-compose build --no-cache
    echo -e "${GREEN}Build complete!${NC}"
}

# Show logs
show_logs() {
    docker-compose logs -f tournament-manager
}

# Create backup
create_backup() {
    echo -e "${GREEN}Creating backup...${NC}"
    
    # Create backups directory if it doesn't exist
    mkdir -p backups
    
    # Create backup
    BACKUP_FILE="backups/tournament-data-$(date +%Y%m%d-%H%M%S).tar.gz"
    docker run --rm -v tournament-manager-2-opus_tournament-data:/data -v $(pwd)/backups:/backups alpine \
        tar -czf /backups/$(basename $BACKUP_FILE) -C /data .
    
    echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
}

# Restore from backup
restore_backup() {
    # List available backups
    echo "Available backups:"
    ls -la backups/*.tar.gz 2>/dev/null || echo "No backups found"
    
    echo ""
    read -p "Enter backup filename to restore (or 'cancel' to abort): " BACKUP_FILE
    
    if [ "$BACKUP_FILE" == "cancel" ]; then
        echo "Restore cancelled."
        return
    fi
    
    if [ ! -f "backups/$BACKUP_FILE" ]; then
        echo -e "${RED}Backup file not found: backups/$BACKUP_FILE${NC}"
        return
    fi
    
    echo -e "${YELLOW}WARNING: This will replace all current tournament data!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled."
        return
    fi
    
    echo -e "${GREEN}Restoring from backup...${NC}"
    
    # Stop services
    docker-compose down
    
    # Clear existing data and restore
    docker run --rm -v tournament-manager-2-opus_tournament-data:/data -v $(pwd)/backups:/backups alpine \
        sh -c "rm -rf /data/* && tar -xzf /backups/$BACKUP_FILE -C /data"
    
    # Start services
    docker-compose up -d
    
    echo -e "${GREEN}Restore complete!${NC}"
}

# Clean up
clean_up() {
    echo -e "${YELLOW}This will remove all containers, images, and volumes!${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Clean up cancelled."
        return
    fi
    
    docker-compose down -v --rmi all
    echo -e "${GREEN}Clean up complete!${NC}"
}

# Show status
show_status() {
    echo -e "${GREEN}Tournament Manager Status:${NC}"
    docker-compose ps
    echo ""
    echo -e "${GREEN}Data Volume Info:${NC}"
    docker volume inspect tournament-manager-2-opus_tournament-data 2>/dev/null || echo "Volume not found"
}

# Main script
check_docker

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    build)
        build_image
        ;;
    logs)
        show_logs
        ;;
    backup)
        create_backup
        ;;
    restore)
        restore_backup
        ;;
    clean)
        clean_up
        ;;
    status)
        show_status
        ;;
    *)
        usage
        exit 1
        ;;
esac
