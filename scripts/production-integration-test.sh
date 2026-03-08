#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://trmnl-badges.gohk.xyz}"
BASE_URL="${BASE_URL%/}"
HEALTH_RETRIES="${HEALTH_RETRIES:-24}"
HEALTH_RETRY_DELAY_SECONDS="${HEALTH_RETRY_DELAY_SECONDS:-5}"
RECIPE_IDS="${RECIPE_IDS:-11023,240176,227153}"
AUTHOR_USER_IDS="${AUTHOR_USER_IDS:-29,1162}"

IFS=',' read -r -a RECIPE_ID_ARRAY <<< "$RECIPE_IDS"
IFS=',' read -r -a AUTHOR_USER_ID_ARRAY <<< "$AUTHOR_USER_IDS"
SELECTED_RECIPE_ID=""
SELECTED_AUTHOR_USER_ID=""

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

select_valid_recipe_id() {
  echo "Selecting a valid recipe ID from: ${RECIPE_IDS}"

  for recipe_id in "${RECIPE_ID_ARRAY[@]}"; do
    local status
    local body
    status="$(curl -sS -o /tmp/trmnl-badges-stats.json -w "%{http_code}" --max-time 20 "${BASE_URL}/api/stats?recipe=${recipe_id}" || true)"
    body="$(cat /tmp/trmnl-badges-stats.json 2>/dev/null || true)"

    if [ "$status" = "200" ] && echo "$body" | grep -q '"id"'; then
      SELECTED_RECIPE_ID="$recipe_id"
      echo "✓ Selected recipe ID: ${SELECTED_RECIPE_ID}"
      return 0
    fi

    echo "Skipping recipe ID ${recipe_id} (status=${status})"
  done

  echo "✗ No valid recipe ID found in: ${RECIPE_IDS}"
  exit 1
}

select_valid_author_user_id() {
  echo "Selecting a valid author user ID from: ${AUTHOR_USER_IDS}"

  for user_id in "${AUTHOR_USER_ID_ARRAY[@]}"; do
    local status
    local body
    status="$(curl -sS -o /tmp/trmnl-badges-recipes.json -w "%{http_code}" --max-time 20 "${BASE_URL}/api/recipes?user_id=${user_id}" || true)"
    body="$(cat /tmp/trmnl-badges-recipes.json 2>/dev/null || true)"

    if [ "$status" = "200" ] && echo "$body" | grep -q '"data"'; then
      SELECTED_AUTHOR_USER_ID="$user_id"
      echo "✓ Selected author user ID: ${SELECTED_AUTHOR_USER_ID}"
      return 0
    fi

    echo "Skipping author user ID ${user_id} (status=${status})"
  done

  echo "✗ No valid author user ID found in: ${AUTHOR_USER_IDS}"
  exit 1
}

echo "Running production integration tests against: ${BASE_URL}"
wait_for_health
select_valid_recipe_id
select_valid_author_user_id

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
echo "Testing GET /badge/installs?recipe=${SELECTED_RECIPE_ID}"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/installs?recipe=${SELECTED_RECIPE_ID}")"
assert_contains "$BADGE" '<svg' "Installs badge SVG returned"

# Badge forks endpoint - valid recipe
echo "Testing GET /badge/forks?recipe=${SELECTED_RECIPE_ID}"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/forks?recipe=${SELECTED_RECIPE_ID}")"
assert_contains "$BADGE" '<svg' "Forks badge SVG returned"

# Badge connections endpoint - valid recipe
echo "Testing GET /badge/connections?recipe=${SELECTED_RECIPE_ID}"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/connections?recipe=${SELECTED_RECIPE_ID}")"
assert_contains "$BADGE" '<svg' "Connections badge SVG returned"

# Badge recipes endpoint - valid userId
echo "Testing GET /badge/recipes?userId=${SELECTED_AUTHOR_USER_ID}"
BADGE="$(curl -sS --max-time 20 "${BASE_URL}/badge/recipes?userId=${SELECTED_AUTHOR_USER_ID}")"
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
echo "Testing GET /api/stats?recipe=${SELECTED_RECIPE_ID}"
STATS="$(curl -sS --max-time 20 "${BASE_URL}/api/stats?recipe=${SELECTED_RECIPE_ID}")"
assert_contains "$STATS" '"id"' "Stats API returned JSON with id"

# User recipes API endpoint - valid user
echo "Testing GET /api/recipes?user_id=${SELECTED_AUTHOR_USER_ID}"
RECIPES="$(curl -sS --max-time 20 "${BASE_URL}/api/recipes?user_id=${SELECTED_AUTHOR_USER_ID}")"
assert_contains "$RECIPES" '"data"' "User recipes API returned data"

echo ""
echo "All production integration tests passed! ✓"
