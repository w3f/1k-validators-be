#!/bin/bash

# Define the Docker Compose file path
COMPOSE_FILE="docker-compose.yml"
STACK_NAME="otv"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check if Docker Swarm is initialized
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q 'active'; then
    echo "Docker Swarm is not initialized. Initializing..."
    docker swarm init
fi

# Check if the stack already exists, and remove it if it does
if docker stack ls | grep -q "$STACK_NAME"; then
    echo "Removing existing stack..."
    docker stack rm "$STACK_NAME"
    sleep 5  # Wait for services to stop
fi

# Deploy the Docker Compose file as a Docker Stack
echo "Deploying stack..."
docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"

# Monitor the stack continuously
while true; do
    echo "Press [Ctrl+C] to stop..."
    sleep 10
done