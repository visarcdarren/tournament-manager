#!/bin/bash

echo "Generating package-lock.json files..."

# Generate client lock file
echo "Installing client dependencies..."
cd client
npm install
cd ..

# Generate server lock file  
echo "Installing server dependencies..."
cd server
npm install
cd ..

echo "Lock files generated successfully!"
echo "You can now build the Docker image with: docker-compose build"
