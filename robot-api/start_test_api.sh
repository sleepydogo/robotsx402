#!/bin/bash

# 🤖 Test Robot API - Quick Start Script

echo "🤖 Starting Test Robot API..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install it first."
    exit 1
fi

# Check if required packages are installed
echo "📦 Checking dependencies..."
python3 -c "import fastapi" 2>/dev/null || {
    echo "⚠️  FastAPI not found. Installing dependencies..."
    pip3 install fastapi uvicorn pydantic
}

echo ""
echo "✅ Dependencies OK"
echo ""
echo "🚀 Starting API on http://localhost:8001"
echo "📖 Interactive docs: http://localhost:8001/docs"
echo "🔧 OpenAPI JSON: http://localhost:8001/openapi.json"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the API
python3 test_robot_api.py
