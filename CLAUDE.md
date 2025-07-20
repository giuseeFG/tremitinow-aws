# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TremitiNow AWS is a serverless application for managing ticket processing and validation for ferry services to Tremiti islands. The system handles ticket submission, processing, validation, and integrates with multiple suppliers and a chatbot powered by AWS Bedrock.

## Development Commands

Available commands:
- `npm install` - Install dependencies
- `npm run deploy` - Deploy to AWS using Serverless Framework (default stage)
- `npm run deploy:dev` - Deploy to development stage
- `npm run deploy:prod` - Deploy to production stage
- `npm run remove` - Remove deployed stack
- `npm run logs -f <function-name>` - View function logs
- `npm run invoke -f <function-name>` - Invoke specific function
- `npm run offline` - Run serverless offline (requires serverless-offline plugin)

## Architecture

### Technology Stack
- **Runtime**: Node.js 22.x (ES modules)
- **Cloud Provider**: AWS (Account ID: 074993326091, Region: eu-central-1)
- **Framework**: Serverless Framework v4.17.1
- **Bundler**: Webpack v5.100.2 with serverless-webpack
- **Transpiler**: Babel v7.28.0

### AWS Infrastructure
**Lambda Functions:**
- `submitTickets` - POST /tickets - Insert tickets into main queue
- `processTickets_s3` - SQS trigger - Process tickets and store in S3/DynamoDB/PostgreSQL
- `processTickets_error` - POST /processTickets_error - Handle failed ticket processing
- `checkQueue` - POST /checkQueue - Check main queue status
- `checkDLQ` - POST /checkDLQ - Check dead letter queue status
- `replayDLQ` - POST /replayDLQ - Replay tickets from DLQ to main queue
- `validateTicket` - Ticket validation logic
- `getTicketByNumber` - GET /ticket/{number} - Retrieve ticket by number
- `tremiti-bot-lambda` - TremitiBot AI assistant powered by AWS Bedrock (Claude Haiku)

**Authorizers:**
- `LambdaAuthorizer` - Validates supplier tokens for /tickets endpoint
- `TokenAuthorizer` - Firebase JWT validation for admin/checker roles
- `UserTokenAuthorizer` - Firebase JWT validation for mobile app users

**AWS Resources:**
- **SQS**: `tickets-queue` (main), `tickets-dlq` (dead letter queue)
- **S3**: `tremitinow-ticket-staging` (ticket storage)
- **DynamoDB**: `tickets` table
- **API Gateway**: REST API with multiple endpoints
- **PostgreSQL**: External database for ticket data

### Project Structure
```
/src
  /handlers         - Lambda function handlers
    - submitTickets.js
    - processTickets_s3.js
    - processTickets_error.js
    - checkQueue.js
    - checkDLQ.js
    - replayDLQ.js
    - validateTicket.js
    - getTicketByNumber.js
  /authorizers      - Lambda authorizer functions
    - LambdaAuthorizer.js
    - TokenAuthorizer.js
    - UserTokenAuthorizer.js
  /bot              - TremitiBot AI assistant
    - tremiti-bot-lambda.js     # Main Lambda handler
    - /shared/services/         # Core AI service
      - tremitiBot.js          # TremitiBot class with Bedrock integration
    - /data/                   # JSON knowledge base
      - json_jet.json          # JET NLG ferry schedules
      - json_nave.json         # NAVE Santa Lucia schedules
      - json_gargano.json      # Navitremiti schedules
      - json_zenit.json        # Zenit schedules
      - json_elicottero.json   # Helicopter schedules
      - json_cale.json         # Beaches and bays info
      - json_pagine.json       # Hotels, restaurants, services
      - json_traghettiinterni.json # Internal ferry connections
  /utils            - Shared utilities
serverless.yml      - Serverless Framework configuration
webpack.config.js   - Webpack bundling configuration
.env.example        - Environment variables template
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- **AWS credentials** - Already configured for account 074993326091
- **Supplier tokens** - 5 different supplier authentication tokens  
- **PostgreSQL connection** - External database URL with SSL
- **Firebase credentials** - Service account for JWT validation
- **Bedrock settings** - AI model configuration for TremitiBot chatbot
- **SQS URLs** - MAIN_QUEUE_URL and DLQ_URL for ticket processing
- **S3 bucket** - Staging bucket for ticket storage

## Supplier Integration

The system supports 5 suppliers:
1. NLG (ID: 1)
2. ALIDAUNIA (ID: 2) 
3. NAVITREMITI (ID: 3)
4. GSTRAVEL (ID: 4)
5. UTENTE_PRIVATO (ID: 5)

Each supplier has unique authentication tokens for API access.

## TremitiBot AI Assistant

### Overview
TremitiBot is an advanced AI assistant specialized for the Tremiti Islands, powered by AWS Bedrock with Claude 3.5 Sonnet. It provides comprehensive information about ferry schedules, accommodations, restaurants, beaches, and tourist services.

### Key Features
- **Intelligent Query Categorization**: Automatically categorizes user queries to provide relevant information
- **RAG (Retrieval-Augmented Generation)**: Filters and delivers contextual data based on query type
- **Ferry Schedule Management**: Complete schedules for 5 transport companies (JET, NAVE, Navitremiti, Zenit, Helicopter)
- **Comprehensive Database**: 200+ structures including hotels, restaurants, bars, beaches (58 coves)
- **Date Processing**: Dynamic interpretation of "oggi" (today), "domani" (tomorrow), "dopodomani" (day after tomorrow)
- **Database Integration**: Optional PostgreSQL logging for conversation tracking

### API Endpoints
- **POST /chat** - Send message to TremitiBot
- **GET /health** - Health check for bot service
- **OPTIONS /chat** - CORS preflight support

### Query Categories
The bot automatically categorizes queries into:
- `traghetti` - Ferry schedules and bookings
- `cale` - Beaches and bays information  
- `hotel` - Accommodation options
- `ristoranti` - Restaurants and dining
- `taxi` - Transportation services
- `collegamenti` - Internal ferry connections
- `escursioni` - Tours and boat trips
- `servizi` - General services
- `eventi` - Events and activities

### Data Sources
- **Ferry Companies**: JET NLG, NAVE Santa Lucia, Navitremiti, Zenit, Alidaunia Helicopter
- **Accommodations**: Hotels, B&Bs, apartments, campsites
- **Dining**: Restaurants, pizzerias, bars, gelaterias
- **Activities**: Diving centers, boat rentals, tours, taxi services
- **Beaches**: 58 coves across San Domino, Capraia, San Nicola, Cretaccio

### Integration
TremitiBot is fully integrated into the tremitinow-aws infrastructure and shares the same PostgreSQL database for conversation logging and user interaction tracking.

## Development Notes

- All Lambda functions use ES modules syntax (import/export)
- AWS SDK v3 is used for newer functions, v2 for legacy code
- Authentication is handled via custom Lambda authorizers
- Error handling includes DLQ processing for failed messages
- The system integrates with external PostgreSQL database and Firebase
- TremitiBot uses AWS Bedrock with Claude Haiku model for natural language processing
- CORS is enabled for web application integration