#!/bin/bash

# Test empty query
echo "Test 1: Empty query"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userQuery":"","userId":"test-user","sessionId":"test-empty"}' 2>&1 | jq -r '.error // "Success"'

echo -e "\n\n"

# Test very long query (500+ characters)
echo "Test 2: Very long query"
LONG_QUERY="I need a gift for my incredibly wonderful and amazing dad who absolutely loves coffee more than anything in the world and who has been drinking coffee every single morning for the past 30 years and really enjoys trying new brewing methods and different types of beans from around the world and he also loves to read books about coffee history and coffee culture and he has a small coffee shop collection at home with various equipment like french press pour over espresso machine and more and my budget is around fifty dollars but I could go a bit higher if needed"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d "{\"userQuery\":\"$LONG_QUERY\",\"userId\":\"test-user\",\"sessionId\":\"test-long\"}" 2>&1 | jq -r 'if .mode then "Mode: \(.mode)" else .error end' | head -5

echo -e "\n\n"

# Test special characters
echo "Test 3: Special characters"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userQuery":"gift for mom with $50 budget & <3 cooking!","userId":"test-user","sessionId":"test-special"}' 2>&1 | jq -r 'if .mode then "Mode: \(.mode)" else .error end'

echo -e "\n\n"

# Test invalid JSON
echo "Test 4: Invalid JSON"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{invalid json}' 2>&1 | grep -oE "error|Unexpected token" | head -1

echo -e "\n\n"

# Test missing required field
echo "Test 5: Missing userQuery"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","sessionId":"test-missing"}' 2>&1 | jq -r '.error // "Success"'
