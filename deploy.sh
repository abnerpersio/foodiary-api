#!/bin/bash

set -e

echo "🚀 Starting deployment..."

if [ -f .env ]; then
    echo "📄 Loading environment variables..."
    set -a
    source .env
    set +a
fi

echo "🧹 Cleaning previous builds..."
pnpm run clean

echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building TypeScript..."
pnpm run build

rm -rf dist/*.map

echo "📦 Creating Lambda deployment package..."
rm -rf lambda-pkg
mkdir -p lambda-pkg
cp -r dist/* lambda-pkg/
cp package.json lambda-pkg/
cd lambda-pkg
pnpm install --only=production
cd ..

echo "✅ Validating CDK template..."
pnpm run synth

echo "☁️  Deploying to AWS..."
pnpm run deploy

echo "✅ Deployment completed successfully!"

echo "🧹 Cleaning up..."
rm -rf lambda-pkg