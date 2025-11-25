#!/bin/bash

# Test vague query to trigger dialogue
echo "Testing vague query: 'gift'"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userQuery":"gift","userId":"test-user","sessionId":"test-session-1"}'

echo -e "\n\n===================================\n"

# Test specific query
echo "Testing specific query: 'gift for dad who loves coffee, budget 50'"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userQuery":"gift for dad who loves coffee, budget 50","userId":"test-user","sessionId":"test-session-2"}'

echo -e "\n\n===================================\n"

# Test birthday query
echo "Testing birthday query: 'birthday present'"
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"userQuery":"birthday present","userId":"test-user","sessionId":"test-session-3"}'
