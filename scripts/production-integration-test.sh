#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://trmnl-badges.gohk.xyz}"
BASE_URL="${BASE_URL%/}"
HEALTH_RETRIES="${HEALTH_RETRIES:-24}"
HEALTH_RETRY_DELAY_SECONDS="${HEALTH_RETRY_DELAY_SECONDS:-5}"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="$3"

  if echo "$haystack" | grep -q "$needle"; then
    echo "✓ $message"
  else
    echo "✗ $message"
    exit 1
  fi
}

wait_for_health() {
  echo "Waiting for production health endpoint: ${BASE_URL}/health"

  for i in $(seq 1 "$HEALTH_RETRIES"); do
    local response
    response="$(curl -sS --max-time 20 "${BASE_URL}/health" || true)"

    if echo "$response" | grep -q '"status":"ok"'; then
      echo "✓ Production endpoint is healthy"
      return 0
    fi

    echo "Attempt ${i}/${HEALTH_RETRIES} not ready; waiting ${HEALTH_RETRY_DELAY_SECONDS}s"
    sleep "$HEALTH_RETRY_DELAY_SECONDS"
  done

  echo "✗ Production endpoint did not become healthy in time"
  exit 1
}

echo "Running production integration tests against: ${BASE_URL}"
wait_for_health

echo ""
echo "Testing production endpoints..."
echo ""

# Health endpoint
echo "Testing GET /health"
HEALTH="$(curl -sS --max-time 20 "${BASE_URL}/health")"
assert_contains "$HEALTH" '"status":"ok"' "Health endpoint working"

# Badge installs endpoint - missing recipe
echo "Testing GET /badge/installs (missing recipe)"
RESPONSE="$(curl -sS --max-time 20 "${BASE_URL}/badge/installs")"
assert_contains "$RESPONSE" '<svg' "Error badge SVG returned"
assert_contains "$RESPONSE" 'Missing recipe or userId' "Error badge has expected message"

# Badge installs endpoint - valid recipe
echo "Testing GET /badge/installs?recipe=28496"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/installs?recipe=28496")"
assert_contains "$BADGE" '<svg' "Installs badge SVG returned"

# Badge forks endpoint - valid recipe
echo "Testing GET /badge/forks?recipe=28496"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/forks?recipe=28496")"
assert_contains "$BADGE" '<svg' "Forks badge SVG returned"

# Badge connections endpoint - valid recipe
echo "Testing GET /badge/connections?recipe=28496"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/connections?recipe=28496")"
assert_contains "$BADGE" '<svg' "Connections badge SVG returned"

# Badge recipes endpoint - valid userId
echo "Testing GET /badge/recipes?userId=4318"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/recipes?userId=4318")"
assert_contains "$BADGE" '<svg' "Recipes badge SVG returned"

# Stats API endpoint - missing recipe
echo "Testing GET /api/stats (missing recipe)"
STATUS="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "${BASE_URL}/api/stats")"
if [ "$STATUS" = "400" ]; then
  echo "✓ Returns 400 for missing recipe"
else
  echo "✗ Expected 400 for missing recipe, got ${STATUS}"
  exit 1
fi

# Stats API endpoint - valid recipe
echo "Testing GET /api/stats?recipe=28496"
STATS="$(curl -sS --max-time 20 "${BASE_URL}/api/stats?recipe=28496")"
assert_contains "$STATS" '"id"' "Stats API returned JSON with id"

# User recipes API endpoint - valid user
echo "Testing GET /api/recipes?user_id=4318"
RECIPES="$(curl -sS --max-time 20 "${BASE_URL}/api/recipes?user_id=4318")"
assert_contains "$RECIPES" '"data"' "User recipes API returned data"

echo ""
echo "All production integration tests passed! ✓"
