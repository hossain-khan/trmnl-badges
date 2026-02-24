#!/bin/bash
set -e

echo "Starting Wrangler dev server..."
npx wrangler dev --port 8787 &
DEV_PID=$!

# Wait for the server to be ready
echo "Waiting for server to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "✓ Server is ready"
    break
  fi
  echo "Attempt $i/30... waiting"
  sleep 1
  if [ $i -eq 30 ]; then
    kill $DEV_PID || true
    echo "✗ Server failed to start"
    exit 1
  fi
done

echo ""
echo "Running integration tests..."
echo ""

# Health endpoint
echo "Testing GET /health"
HEALTH=$(curl -s http://localhost:8787/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✓ Health endpoint working"
else
  echo "✗ Health endpoint failed"
  kill $DEV_PID || true
  exit 1
fi

# Badge installs endpoint - missing recipe
echo "Testing GET /badge/installs (missing recipe)"
RESPONSE=$(curl -s http://localhost:8787/badge/installs)
if echo "$RESPONSE" | grep -q '<svg' && echo "$RESPONSE" | grep -q 'Missing recipe or userId'; then
  echo "✓ Returns error badge for missing recipe"
else
  echo "✗ Expected error badge with 'Missing recipe or userId' message"
  kill $DEV_PID || true
  exit 1
fi

# Badge installs endpoint - valid recipe
echo "Testing GET /badge/installs?recipe=28496"
BADGE=$(curl -s http://localhost:8787/badge/installs?recipe=28496)
if echo "$BADGE" | grep -q '<svg'; then
  echo "✓ Badge SVG returned"
else
  echo "✗ Badge endpoint failed"
  kill $DEV_PID || true
  exit 1
fi

# Badge forks endpoint - valid recipe
echo "Testing GET /badge/forks?recipe=28496"
BADGE=$(curl -s http://localhost:8787/badge/forks?recipe=28496)
if echo "$BADGE" | grep -q '<svg'; then
  echo "✓ Forks badge SVG returned"
else
  echo "✗ Forks badge endpoint failed"
  kill $DEV_PID || true
  exit 1
fi

# Stats API endpoint - missing recipe
echo "Testing GET /api/stats (missing recipe)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/api/stats)
if [ "$STATUS" == "400" ]; then
  echo "✓ Returns 400 for missing recipe"
else
  echo "✗ Expected 400, got $STATUS"
  kill $DEV_PID || true
  exit 1
fi

# Stats API endpoint - valid recipe
echo "Testing GET /api/stats?recipe=28496"
STATS=$(curl -s http://localhost:8787/api/stats?recipe=28496)
if echo "$STATS" | grep -q '"id"'; then
  echo "✓ Stats API returned JSON with id"
else
  echo "✗ Stats endpoint failed"
  kill $DEV_PID || true
  exit 1
fi

# Clean shutdown
echo ""
echo "All integration tests passed! ✓"
kill $DEV_PID || true
exit 0
