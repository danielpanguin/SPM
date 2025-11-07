#!/bin/bash

echo "Testing API endpoints..."
echo ""

# Test if server is running
echo "1. Testing if server is running..."
curl -s http://localhost:3000/api/tasks 2>&1 | head -c 200
echo ""
echo ""

# Test statuses endpoint
echo "2. Testing /api/statuses..."
curl -s http://localhost:3000/api/statuses 2>&1 | head -c 500
echo ""
echo ""

# Test status change endpoint (will fail without valid task, but should return proper error)
echo "3. Testing /api/tasks/1/status..."
curl -s -X PATCH http://localhost:3000/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -d '{"status_id": 2, "user_id": "test"}' 2>&1 | head -c 500
echo ""
