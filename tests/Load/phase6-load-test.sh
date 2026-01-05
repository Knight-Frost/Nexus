#!/bin/bash

# Phase 6 Load Test - Using wrk (reliable, no k6 issues)
# Tests: Analytics, Contracts, Ledger, Notifications

BASE_URL="http://127.0.0.1:8000"
ADMIN_TOKEN="5|AUW0tCCsApL2uo7lAFGwyO5ycPn3BQVVZEIOYNjR910a5a6f"
TENANT_TOKEN="6|bUT48inrKaCr89q5xW17sZUnXQzNzEpIcYTWa0Mx1f132edd"
LANDLORD_TOKEN="7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1"

echo "🚀 Phase 6 Load Test Starting..."
echo "================================"
echo ""

# Get real contract IDs from database
echo "📊 Fetching real resource IDs..."
CONTRACT_IDS=$(php artisan tinker --execute="echo \App\Models\Contract::pluck('id')->implode(',');")
LEDGER_IDS=$(php artisan tinker --execute="echo \App\Models\LedgerEntry::pluck('id')->implode(',');")

FIRST_CONTRACT=$(echo $CONTRACT_IDS | cut -d',' -f1)
FIRST_LEDGER=$(echo $LEDGER_IDS | cut -d',' -f1)

echo "✅ Found $FIRST_CONTRACT (contract)"
echo "✅ Found $FIRST_LEDGER (ledger)"
echo ""

# Test 1: Analytics Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Analytics Platform (60s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
wrk -t4 -c50 -d60s \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  "$BASE_URL/api/analytics/platform"
echo ""

# Test 2: Contract List
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Contract List (60s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
wrk -t4 -c50 -d60s \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  "$BASE_URL/api/landlord/contracts"
echo ""

# Test 3: Single Contract Read
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Contract Read (60s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
wrk -t4 -c50 -d60s \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  "$BASE_URL/api/landlord/contracts/$FIRST_CONTRACT"
echo ""

# Test 4: Ledger List
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Ledger List (60s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
wrk -t4 -c50 -d60s \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  "$BASE_URL/api/landlord/ledger"
echo ""

# Test 5: Notifications
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Notifications (60s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
wrk -t4 -c50 -d60s \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  "$BASE_URL/api/notifications"
echo ""

# Test 6: Mixed Load (Realistic)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Mixed Load Test (5 minutes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > /tmp/wrk-mixed.lua << 'LUA'
request = function()
  local urls = {
    "/api/analytics/platform",
    "/api/landlord/contracts",
    "/api/landlord/ledger",
    "/api/notifications"
  }
  local url = urls[math.random(#urls)]
  return wrk.format("GET", url)
end
LUA

wrk -t8 -c100 -d300s \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -s /tmp/wrk-mixed.lua \
  "$BASE_URL"

echo ""
echo "✅ Phase 6 Load Test Complete!"
echo "================================"
