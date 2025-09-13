#!/bin/bash

# Configuration
FUNCTION_NAME="ferryhopper-proxy"
REGION="eu-central-1"
RUNTIME="nodejs18.x"
HANDLER="index.handler"
ROLE_ARN="arn:aws:iam::074993326091:role/lambda_basic_execution"
AWS_PROFILE="tremitinow"

# Create deployment package
echo "Creating deployment package..."
zip -r function.zip index.js package.json

# Check if function exists
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    # Update existing function
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION
else
    # Create new function
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://function.zip \
        --timeout 30 \
        --memory-size 256 \
        --region $REGION
fi

# Clean up
rm function.zip

echo "Deployment complete!"
echo "Don't forget to:"
echo "1. Update the ROLE_ARN in this script with your actual IAM role"
echo "2. Configure API Gateway to trigger this Lambda"
echo "3. Update the Ionic app with the API Gateway endpoint"