#!/bin/bash

echo "🧪 Testing Docker build..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t cronjob-manager .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
    echo "🚀 You can now run the application with:"
    echo "   docker-compose up"
    echo ""
    echo "   Or run the container directly with:"
    echo "   docker run -p 3000:3000 --network host --privileged cronjob-manager"
else
    echo "❌ Docker build failed!"
    exit 1
fi
