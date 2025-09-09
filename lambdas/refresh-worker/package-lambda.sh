#!/bin/bash

# CoC Refresh Worker Lambda Packaging and Deployment Script
# Creates deployment-ready ZIP package for AWS Lambda and optionally deploys it
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/package"
DEPLOYMENT_ZIP="$SCRIPT_DIR/coc-refresh-worker-lambda.zip"

# AWS Configuration
S3_BUCKET="clan-boards-lambda-artifacts"
LAMBDA_FUNCTION_NAME="webapp-refresh-worker"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Parse command line arguments
SKIP_UPLOAD=false
SKIP_DEPLOY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-upload)
            SKIP_UPLOAD=true
            shift
            ;;
        --skip-deploy)
            SKIP_DEPLOY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-upload    Skip S3 upload (package only)"
            echo "  --skip-deploy    Skip Lambda deployment (upload only)"
            echo "  --dry-run        Show what would be done without executing"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🚀 Packaging CoC Refresh Worker Lambda"
echo "📂 Project root: $PROJECT_ROOT"
echo "📦 Package directory: $PACKAGE_DIR" 

# Check AWS CLI prerequisites if deployment is requested
if [[ "$SKIP_UPLOAD" == false || "$SKIP_DEPLOY" == false ]]; then
    echo ""
    echo "🔍 Checking AWS CLI prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo "❌ Error: AWS CLI is not installed"
        echo "Please install AWS CLI and configure credentials to enable deployment"
        echo "Run with --skip-upload --skip-deploy to package only"
        exit 1
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ Error: AWS credentials are not configured"
        echo "Please configure AWS credentials using 'aws configure' or environment variables"
        echo "Run with --skip-upload --skip-deploy to package only"
        exit 1
    fi
    
    echo "✅ AWS CLI and credentials configured"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "🔍 DRY RUN MODE: Will show actions without executing them"
    fi
fi

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

# S3 Upload Section
if [[ "$SKIP_UPLOAD" == false ]]; then
    echo ""
    echo "📤 Uploading to S3..."
    
    # Generate timestamped filename for versioning
    TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    S3_KEY="coc-refresh-worker-lambda-${TIMESTAMP}.zip"
    S3_LATEST_KEY="coc-refresh-worker-lambda-latest.zip"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "🔍 DRY RUN: Would upload $DEPLOYMENT_ZIP to s3://$S3_BUCKET/$S3_KEY"
        echo "🔍 DRY RUN: Would copy to s3://$S3_BUCKET/$S3_LATEST_KEY"
    else
        # Check if S3 bucket exists
        if ! aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
            echo "❌ Error: S3 bucket '$S3_BUCKET' does not exist or is not accessible"
            echo "Please verify the bucket name and your AWS permissions"
            exit 1
        fi
        
        echo "📤 Uploading timestamped version..."
        if aws s3 cp "$DEPLOYMENT_ZIP" "s3://$S3_BUCKET/$S3_KEY" \
            --metadata "project=coc-refresh-worker,timestamp=$TIMESTAMP,version=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"; then
            echo "✅ Uploaded to s3://$S3_BUCKET/$S3_KEY"
        else
            echo "❌ Error: Failed to upload to S3"
            exit 1
        fi
        
        echo "📤 Updating latest version..."
        if aws s3 cp "s3://$S3_BUCKET/$S3_KEY" "s3://$S3_BUCKET/$S3_LATEST_KEY"; then
            echo "✅ Updated s3://$S3_BUCKET/$S3_LATEST_KEY"
        else
            echo "⚠️  Warning: Failed to update latest version"
        fi
        
        echo "📊 S3 upload complete - Object: $S3_KEY"
    fi
else
    echo ""
    echo "⏭️  Skipping S3 upload (--skip-upload specified)"
fi

# Lambda Deployment Section
if [[ "$SKIP_DEPLOY" == false ]]; then
    echo ""
    echo "🚀 Deploying to Lambda..."
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "🔍 DRY RUN: Would update Lambda function '$LAMBDA_FUNCTION_NAME' from s3://$S3_BUCKET/$S3_LATEST_KEY"
    else
        # Check if Lambda function exists
        if ! aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$AWS_REGION" &> /dev/null; then
            echo "❌ Error: Lambda function '$LAMBDA_FUNCTION_NAME' does not exist in region '$AWS_REGION'"
            echo "Please create the function first or verify the function name and region"
            exit 1
        fi
        
        # Use the latest key for deployment
        S3_OBJECT_KEY="$S3_LATEST_KEY"
        if [[ "$SKIP_UPLOAD" == true ]]; then
            # If upload was skipped, try to use an existing object
            if ! aws s3 ls "s3://$S3_BUCKET/$S3_LATEST_KEY" &> /dev/null; then
                echo "❌ Error: No existing package found at s3://$S3_BUCKET/$S3_LATEST_KEY"
                echo "Cannot deploy without uploading first. Remove --skip-upload or upload manually."
                exit 1
            fi
        fi
        
        echo "🔄 Updating Lambda function code..."
        UPDATE_RESULT=$(aws lambda update-function-code \
            --function-name "$LAMBDA_FUNCTION_NAME" \
            --s3-bucket "$S3_BUCKET" \
            --s3-key "$S3_OBJECT_KEY" \
            --region "$AWS_REGION" \
            --output json)
        
        if [[ $? -eq 0 ]]; then
            VERSION=$(echo "$UPDATE_RESULT" | grep -o '"Version": "[^"]*"' | cut -d'"' -f4)
            LAST_MODIFIED=$(echo "$UPDATE_RESULT" | grep -o '"LastModified": "[^"]*"' | cut -d'"' -f4)
            
            echo "✅ Lambda function updated successfully"
            echo "📋 Function: $LAMBDA_FUNCTION_NAME"
            echo "📋 Version: $VERSION"
            echo "📋 Last Modified: $LAST_MODIFIED"
            
            # Wait for function to be ready
            echo "⏳ Waiting for function to be ready..."
            aws lambda wait function-updated --function-name "$LAMBDA_FUNCTION_NAME" --region "$AWS_REGION"
            
            echo "✅ Lambda function deployment complete"
        else
            echo "❌ Error: Failed to update Lambda function"
            exit 1
        fi
    fi
else
    echo ""
    echo "⏭️  Skipping Lambda deployment (--skip-deploy specified)"
fi

# Final cleanup
echo ""
echo "🧹 Cleaning up build artifacts..."
rm -rf "$PACKAGE_DIR"

echo ""
echo "🎉 Process complete!"
echo "📦 Local package: $DEPLOYMENT_ZIP"

if [[ "$SKIP_UPLOAD" == false && "$DRY_RUN" == false ]]; then
    echo "📤 S3 Object: s3://$S3_BUCKET/$S3_KEY"
fi

if [[ "$SKIP_DEPLOY" == false && "$DRY_RUN" == false ]]; then
    echo "🚀 Lambda Function: $LAMBDA_FUNCTION_NAME (updated)"
    echo ""
    echo "✅ Deployment successful!"
else
    echo ""
    echo "📋 Next steps for DevOps:"
    if [[ "$SKIP_UPLOAD" == true ]]; then
        echo "   1. Upload ZIP to AWS Lambda or S3 bucket"
    fi
    if [[ "$SKIP_DEPLOY" == true ]]; then
        echo "   2. Update Lambda function code"
    fi
    echo "   3. Set handler to: lambda_function.lambda_handler"  
    echo "   4. Set environment variables: DATABASE_URL, REDIS_URL, COC_EMAIL, COC_PASSWORD"
    echo "   5. Configure VPC if database requires it"
    echo "   6. Test with provided sample payloads"
fi
echo ""