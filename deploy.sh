#!/bin/bash

set -e

HOTSWAP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --gateway|--hotswap)
      HOTSWAP=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--gateway|--hotswap]"
      echo "  --gateway: Fast deployment for API Gateway/Lambda changes only (uses CDK hotswap)"
      exit 1
      ;;
  esac
done

echo "🚀 Starting deployment..."

if [ -f .env ]; then
    echo "📄 Loading environment variables..."
    set -a
    source .env
    set +a
fi

echo "🧹 Cleaning previous builds..."
pnpm run clean
rm -rf dist 
rm -rf lambda-pkg

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

if [ "$HOTSWAP" = true ]; then
  echo "⚡ Fast deployment mode (hotswap) - skipping CDK synth..."
  echo "☁️  Deploying to AWS with hotswap..."
  cdk deploy --all --hotswap -y
else
  echo "✅ Validating CDK template..."
  cdk synth

  echo "☁️  Deploying to AWS..."
  cdk deploy --all -y
fi

echo "✅ Deployment completed successfully!"

echo "🧹 Cleaning up..."
rm -rf lambda-pkg