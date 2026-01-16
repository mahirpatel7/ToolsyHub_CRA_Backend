#!/bin/bash
set -e

echo "🔨 Installing system dependencies..."
apt-get update
apt-get install -y libreoffice ghostscript python3 python3-pip

echo "📦 Installing Python packages..."
pip3 install pdf2docx

echo "📦 Installing Node dependencies..."
npm install

echo "✅ Build completed successfully"