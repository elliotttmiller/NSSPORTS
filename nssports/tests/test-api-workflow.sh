#!/bin/bash

# Test script for API workflow
# This script tests the bet placement and retrieval workflow

echo "🧪 Testing NorthStar Sports API Workflow"
echo "========================================"
echo ""

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ $2${NC}"
  else
    echo -e "${RED}✗ $2${NC}"
  fi
}

echo "1. Testing GET /api/my-bets (should return empty array initially)"
echo "-------------------------------------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/my-bets")
print_result $([[ "$response" == "200" ]] && echo 0 || echo 1) "GET /api/my-bets returned status $response"
echo ""

echo "2. Testing GET /api/sports"
echo "-------------------------------------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/sports")
print_result $([[ "$response" == "200" ]] && echo 0 || echo 1) "GET /api/sports returned status $response"
echo ""

echo "3. Testing GET /api/games"
echo "-------------------------------------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/games?page=1&limit=10")
print_result $([[ "$response" == "200" ]] && echo 0 || echo 1) "GET /api/games returned status $response"
echo ""

echo "4. Testing POST /api/my-bets (place a single bet)"
echo "-------------------------------------------------------------------"
# First, get a game ID from the games API
game_response=$(curl -s "$API_URL/games?page=1&limit=1")
game_id=$(echo "$game_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$game_id" ]; then
  echo "Using game ID: $game_id"
  
  bet_data='{
    "betType": "moneyline",
    "gameId": "'$game_id'",
    "selection": "home",
    "odds": -150,
    "stake": 100,
    "potentialPayout": 166.67
  }'
  
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-$(date +%s)" \
    -d "$bet_data" \
    "$API_URL/my-bets")
  
  print_result $([[ "$response" == "201" ]] && echo 0 || echo 1) "POST /api/my-bets returned status $response"
else
  echo -e "${YELLOW}⚠ No games found, skipping bet placement test${NC}"
fi
echo ""

echo "5. Testing GET /api/my-bets (should now have 1 bet)"
echo "-------------------------------------------------------------------"
response=$(curl -s "$API_URL/my-bets")
bet_count=$(echo "$response" | grep -o '"id"' | wc -l)
print_result $([[ "$bet_count" -ge 1 ]] && echo 0 || echo 1) "Found $bet_count bet(s) in history"
echo ""

echo "6. Testing POST /api/my-bets (place a parlay bet)"
echo "-------------------------------------------------------------------"
if [ -n "$game_id" ]; then
  parlay_data='{
    "betType": "parlay",
    "legs": [
      {
        "gameId": "'$game_id'",
        "betType": "spread",
        "selection": "home",
        "odds": -110,
        "line": -3.5
      },
      {
        "gameId": "'$game_id'",
        "betType": "total",
        "selection": "over",
        "odds": -110,
        "line": 220.5
      }
    ],
    "stake": 50,
    "potentialPayout": 182.64,
    "odds": 264
  }'
  
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: parlay-test-$(date +%s)" \
    -d "$parlay_data" \
    "$API_URL/my-bets")
  
  print_result $([[ "$response" == "201" ]] && echo 0 || echo 1) "POST /api/my-bets (parlay) returned status $response"
else
  echo -e "${YELLOW}⚠ No games found, skipping parlay bet test${NC}"
fi
echo ""

echo "7. Testing idempotency (should return 200, not 201)"
echo "-------------------------------------------------------------------"
if [ -n "$game_id" ]; then
  idempotency_key="duplicate-test-$(date +%s)"
  
  # First request
  curl -s -o /dev/null \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $idempotency_key" \
    -d "$bet_data" \
    "$API_URL/my-bets"
  
  # Second request with same key
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $idempotency_key" \
    -d "$bet_data" \
    "$API_URL/my-bets")
  
  print_result $([[ "$response" == "200" ]] && echo 0 || echo 1) "Idempotency check returned status $response"
else
  echo -e "${YELLOW}⚠ No games found, skipping idempotency test${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN}✅ API Workflow Tests Complete${NC}"
echo ""
