# CoC Refresh Worker - OpenTofu Deployment Guide

## Overview

This Lambda function processes background refresh requests from the Redis queue to keep CoC data fresh in the database. It should be triggered every 1-2 minutes to continuously process the queue.

## Infrastructure Requirements

### Lambda Function
- **Runtime**: Python 3.11
- **Memory**: 512 MB
- **Timeout**: 300 seconds (5 minutes)
- **Handler**: `lambda_function.lambda_handler`
- **Architecture**: x86_64 or arm64

### Environment Variables
```hcl
environment {
  variables = {
    DATABASE_URL       = var.database_url      # PostgreSQL connection string
    REDIS_URL         = var.redis_url          # Redis connection string  
    COC_EMAIL         = var.coc_email          # Clash of Clans developer portal email
    COC_PASSWORD      = var.coc_password       # Clash of Clans developer portal password
    ENVIRONMENT       = var.environment        # production/staging/development
    LOG_LEVEL         = "INFO"
    PYTHONPATH        = "/var/task:/opt/python"
  }
}
```

### Triggers
1. **CloudWatch Events Rule**: Schedule every 2 minutes
   ```hcl
   schedule_expression = "rate(2 minutes)"
   ```

2. **API Gateway** (optional): For manual triggering and health checks
   - `POST /refresh` - Manual trigger (requires API key)
   - `GET /health` - Health check endpoint

### VPC Configuration (if required)
If the database requires VPC access:
```hcl
vpc_config {
  subnet_ids         = var.lambda_subnet_ids
  security_group_ids = var.lambda_security_group_ids
}
```

### IAM Permissions
Required permissions for the Lambda execution role:
- `logs:CreateLogGroup`
- `logs:CreateLogStream` 
- `logs:PutLogEvents`
- VPC permissions if using VPC configuration

### Dependencies
The Lambda needs access to the `coclib` shared library. Options:
1. **Lambda Layer**: Package coclib as a Lambda layer (recommended)
2. **Include in deployment**: Copy coclib to the deployment package

## Deployment Package Structure
```
refresh-worker/
├── lambda_function.py    # Main handler
├── requirements.txt      # Python dependencies
└── coclib/              # Shared library (if not using layer)
```

## Health Monitoring

### CloudWatch Metrics to Monitor
- `AWS/Lambda/Invocations` - Function execution count
- `AWS/Lambda/Errors` - Error count
- `AWS/Lambda/Duration` - Execution time

### CloudWatch Alarms Recommendations
- **High Error Rate**: > 5 errors in 10 minutes
- **No Invocations**: No executions in 5 minutes (indicates scheduler issue)
- **High Duration**: > 240 seconds (approaching timeout)

### Custom Metrics (logged by function)
- `processed_requests` - Number of refresh requests processed
- `queue_size` - Current Redis queue size
- `api_requests_per_second` - CoC API request rate

## Configuration Notes

### Rate Limiting
The function implements configurable rate limiting:
- **Uses coclib configuration** (COC_REQS_PER_SEC), max 30 requests/second for safety
- **5-minute runtime** with 5-second buffer before Lambda timeout

### Error Handling
- Failed requests are logged but not requeued (prevents infinite loops)
- Function continues processing other requests if one fails
- All errors are captured in CloudWatch logs

### Queue Processing
- Processes requests until queue is empty or timeout approaches
- FIFO processing (no complex priority logic initially)
- Graceful shutdown when approaching Lambda timeout

## Testing the Deployment

### Health Check
```bash
curl https://your-api-gateway-url/health
```
Expected response:
```json
{
  "status": "healthy",
  "queue_size": 42,
  "timestamp": 1694123456.78
}
```

### Manual Trigger
```bash
curl -X POST https://your-api-gateway-url/refresh \
  -H "x-api-key: your-api-key"
```

### Monitor Logs
```bash
aws logs tail /aws/lambda/your-function-name --follow
```

## Rollback Plan
If issues occur:
1. Disable CloudWatch Events trigger to stop scheduled execution
2. Check CloudWatch logs for errors
3. Revert to previous function version if needed
4. Manual queue processing can continue via API Gateway trigger

## Next Steps After Deployment
1. Monitor queue processing for first few hours
2. Verify fresh data appears in database
3. Check CoC API usage stays within limits
4. Set up alerting for function errors
5. Consider scaling trigger frequency based on queue size

## Automated Deployment Pipeline

### GitHub Actions Integration
The Lambda function is automatically built and deployed when changes are detected in:
- `lambdas/refresh-worker/**` - Lambda function code
- `coclib/**` - Shared library dependencies

### Build Process
1. **Trigger**: Push to `main` branch with changes to Lambda or coclib files
2. **Build**: Runs `./package-lambda.sh` to create deployment ZIP
3. **Upload**: Stores artifacts in both S3 and GitHub Actions artifacts

### Artifact Locations
- **S3 Bucket**: `${AWS_LAMBDA_ARTIFACTS_BUCKET}/refresh-worker-{commit-sha}.zip`
- **GitHub Artifacts**: Available for 30 days as `refresh-worker-lambda-{commit-sha}`

### OpenTofu Integration
Infrastructure team can reference artifacts using:
```hcl
# In your OpenTofu Lambda resource
filename = "s3://${var.lambda_artifacts_bucket}/refresh-worker-${var.commit_sha}.zip"
```

### Required GitHub Secrets
Add these secrets to the repository for automated deployment:
- `AWS_LAMBDA_ARTIFACTS_BUCKET` - S3 bucket for Lambda deployment artifacts

### Manual Build Process
If needed, you can still build manually:
```bash
cd lambdas/refresh-worker
./package-lambda.sh
```

### Deployment Verification
After deployment, verify the Lambda function using:
1. **Health Check**: `GET /health` endpoint (if configured)  
2. **CloudWatch Logs**: Monitor function execution logs
3. **Queue Processing**: Check Redis queue is being processed