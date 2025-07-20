#!/bin/bash

# TremitiNow API Test Script - Nuova Struttura Separata
# Data: 20 Luglio 2025

echo "🧪 Testing TremitiNow Separated APIs..."
echo "========================================"

# API URLs
EXTERNAL_API="https://d8r8p6oi51.execute-api.eu-central-1.amazonaws.com/prod"
ADMIN_API="https://ngfw2ilz91.execute-api.eu-central-1.amazonaws.com/prod"
MOBILE_API="https://l3mf60peue.execute-api.eu-central-1.amazonaws.com/prod"
BOT_API="https://ijr1whuvo2.execute-api.eu-central-1.amazonaws.com/prod"

# Test tokens
SUPPLIER_TOKEN="cicKKKunsdaCelPx359MH7R7Zo1frUjtKO4G8xl5"

echo ""
echo "1️⃣  Testing External API (Sistema Esterno)"
echo "URL: ${EXTERNAL_API}"
echo "Testing ticket submission without exemption..."
curl -X POST "${EXTERNAL_API}/tickets/submit" \
  -H "Content-Type: application/json" \
  -H "authorization: ${SUPPLIER_TOKEN}" \
  -d '{
    "date": "2025-07-20",
    "number": "TEST_EXT_001"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "Testing ticket submission with exemption..."
curl -X POST "${EXTERNAL_API}/tickets/submit" \
  -H "Content-Type: application/json" \
  -H "authorization: ${SUPPLIER_TOKEN}" \
  -d '{
    "date": "2025-07-20",
    "number": "TEST_EXT_002",
    "exemption": 5
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "2️⃣  Testing Bot API (Chatbot)"
echo "URL: ${BOT_API}"
echo "Testing health check..."
curl -X GET "${BOT_API}/health" \
  -w "\nStatus: %{http_code}\n\n"

echo "Testing AI chat (may timeout due to Bedrock)..."
curl -X POST "${BOT_API}/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ciao, test rapido"
  }' \
  -w "\nStatus: %{http_code}\n" \
  --max-time 10

echo ""
echo "3️⃣  Testing Admin API (requires Firebase token)"
echo "URL: ${ADMIN_API}"
echo "Note: I seguenti test falliranno senza token Firebase valido"
echo ""

echo "Testing queue status..."
curl -X GET "${ADMIN_API}/admin/queue/status" \
  -H "authorization: test-token" \
  -w "\nStatus: %{http_code}\n\n"

echo "4️⃣  Testing Mobile API (requires Firebase token)"
echo "URL: ${MOBILE_API}"
echo "Note: I seguenti test falliranno senza token Firebase valido"
echo ""

echo "Testing ticket lookup..."
curl -X POST "${MOBILE_API}/mobile/ticket/lookup" \
  -H "Content-Type: application/json" \
  -H "authorization: test-token" \
  -d '{
    "number": "TEST_EXT_001"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Test completati!"
echo ""
echo "📋 Risultati attesi:"
echo "- External API: 200 (ticket submission)"
echo "- Bot API Health: 200"
echo "- Bot AI Chat: 200 o timeout"
echo "- Admin API: 401/403 (no token)"
echo "- Mobile API: 401/403 (no token)"
echo ""
echo "🔍 Per test completi, usare token Firebase validi"