#!/bin/bash

# CoC Refresh Worker Lambda Packaging Script
# Creates deployment-ready ZIP package for AWS Lambda
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/package"
DEPLOYMENT_ZIP="$SCRIPT_DIR/coc-refresh-worker-lambda.zip"

echo "🚀 Packaging CoC Refresh Worker Lambda"
echo "📂 Project root: $PROJECT_ROOT"
echo "📦 Package directory: $PACKAGE_DIR" 

# Clean up previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$PACKAGE_DIR"
rm -f "$DEPLOYMENT_ZIP"
mkdir -p "$PACKAGE_DIR"

# Validate required files
echo "✅ Validating required files..."
required_files=(
    "$SCRIPT_DIR/lambda_function.py"
    "$SCRIPT_DIR/requirements.txt"
    "$PROJECT_ROOT/coclib"
)

for file in "${required_files[@]}"; do
    if [[ ! -e "$file" ]]; then
        echo "❌ Error: Required file/directory not found: $file"
        exit 1
    fi
done

# Install Python dependencies
echo "📥 Installing Python dependencies..."
cd "$SCRIPT_DIR"

if [[ ! -f "requirements.txt" ]]; then
    echo "❌ Error: requirements.txt not found"
    exit 1
fi

# Install to package directory
python3 -m pip install \
    --target "$PACKAGE_DIR" \
    --requirement requirements.txt \
    --no-deps \
    --platform manylinux2014_x86_64 \
    --only-binary=:all: \
    --upgrade

echo "📊 Installed packages:"
ls -la "$PACKAGE_DIR" | head -10

# Copy Lambda function
echo "📋 Copying Lambda function..."
cp "$SCRIPT_DIR/lambda_function.py" "$PACKAGE_DIR/"

# Copy coclib library
echo "📚 Copying coclib library..."
cp -r "$PROJECT_ROOT/coclib" "$PACKAGE_DIR/"

# Remove unnecessary files to reduce package size
echo "🗑️  Removing unnecessary files..."
cd "$PACKAGE_DIR"

# Remove test files and cache
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.egg-info" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "test*" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*test*.py" -delete 2>/dev/null || true

# Remove large unnecessary packages
rm -rf scipy/ 2>/dev/null || true
rm -rf pandas/ 2>/dev/null || true
rm -rf matplotlib/ 2>/dev/null || true
rm -rf jupyter* 2>/dev/null || true
rm -rf IPython/ 2>/dev/null || true

# Remove development tools
rm -rf pip/ 2>/dev/null || true
rm -rf setuptools/ 2>/dev/null || true
rm -rf wheel/ 2>/dev/null || true

echo "🗜️  Package size optimization complete"

# Validate coclib structure
echo "✅ Validating coclib structure..."
required_coclib_files=(
    "coclib/__init__.py"
    "coclib/models.py"
    "coclib/db_session.py"
    "coclib/queue/refresh_queue.py"
    "coclib/queue/queue_factory.py" 
    "coclib/services/clan_service.py"
    "coclib/services/player_service.py"
    "coclib/services/war_service.py"
)

for file in "${required_coclib_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "⚠️  Warning: Expected coclib file not found: $file"
    fi
done

# Create ZIP package
echo "📦 Creating deployment ZIP..."
zip -r "$DEPLOYMENT_ZIP" . -q

cd "$SCRIPT_DIR"

# Display package information
PACKAGE_SIZE=$(du -h "$DEPLOYMENT_ZIP" | cut -f1)
UNZIPPED_SIZE=$(du -sh "$PACKAGE_DIR" | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo "📁 ZIP file: $DEPLOYMENT_ZIP"
echo "📊 ZIP size: $PACKAGE_SIZE"
echo "📊 Unzipped size: $UNZIPPED_SIZE"
echo ""

# Validate ZIP contents
echo "🔍 ZIP contents preview:"
unzip -l "$DEPLOYMENT_ZIP" | head -20
echo "..."
echo "📋 Total files in ZIP: $(unzip -l "$DEPLOYMENT_ZIP" | tail -1 | awk '{print $2}')"

# Check for common issues
echo ""
echo "🔍 Validation checks:"

# Check ZIP size (Lambda limit is 50MB)
ZIP_SIZE_MB=$(du -m "$DEPLOYMENT_ZIP" | cut -f1)
if [[ $ZIP_SIZE_MB -gt 50 ]]; then
    echo "⚠️  WARNING: Package size (${ZIP_SIZE_MB}MB) exceeds Lambda limit (50MB)"
else
    echo "✅ Package size (${ZIP_SIZE_MB}MB) is within Lambda limit (50MB)"
fi

# Check for Lambda function
if unzip -l "$DEPLOYMENT_ZIP" | grep -q "lambda_function.py"; then
    echo "✅ Lambda function handler found"
else
    echo "❌ ERROR: lambda_function.py not found in package"
fi

# Check for coclib
if unzip -l "$DEPLOYMENT_ZIP" | grep -q "coclib/"; then
    echo "✅ coclib library included"
else
    echo "❌ ERROR: coclib library not found in package"
fi

# Final cleanup
echo ""
echo "🧹 Cleaning up build artifacts..."
rm -rf "$PACKAGE_DIR"

echo ""
echo "🎉 Packaging complete!"
echo "📦 Deployment package: $DEPLOYMENT_ZIP"
echo ""
echo "📋 Next steps for DevOps:"
echo "   1. Upload ZIP to AWS Lambda or use with infrastructure tools"
echo "   2. Set handler to: lambda_function.lambda_handler"  
echo "   3. Set environment variables: DATABASE_URL, REDIS_URL, COC_EMAIL, COC_PASSWORD"
echo "   4. Configure VPC if database requires it"
echo "   5. Test with provided sample payloads"
echo ""