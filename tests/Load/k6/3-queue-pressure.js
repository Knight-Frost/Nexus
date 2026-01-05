/**
 * Phase 6 - Scenario 3: Async Queue Pressure Testing
 * 
 * Purpose: Validate async invalidation pipeline under sustained pressure
 * 
 * Strategy:
 * - Generate writes that trigger >100 key invalidations (async threshold)
 * - Sustain dispatch rate > worker processing rate
 * - Observe queue backlog growth
 * - Validate retry behavior
 * - Confirm writes never block
 * 
 * Traffic Pattern:
 * - Warm-up: 20 VUs - 1 min
 * - Pressure: 100 VUs - 10 min (sustained queue pressure)
 * - Cool-down: 0 VUs - 5 min (observe queue drain)
 * 
 * Expected Observations:
 * - Queue depth increases during pressure
 * - Queue drains during cool-down
 * - Write latency remains low (<100ms)
 * - Job retry behavior (if failures occur)
 * - Async vs sync routing ratio
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Gauge, Trend } from 'k6/metrics';

const asyncInvalidations = new Counter('async_invalidations');
const syncInvalidations = new Counter('sync_invalidations');
const writeBlockTime = new Trend('write_block_time');
const queueDepth = new Gauge('queue_depth_estimate');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Warm-up
    { duration: '10m', target: 100 }, // Sustained pressure
    { duration: '5m', target: 0 },    // Cool-down and observe
  ],
  thresholds: {
    'write_block_time': ['p(95)<100'], // Writes must complete fast
    'http_req_failed{operation:write}': ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:8000';
const LANDLORD_TOKEN = '7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1';

export default function () {
  // Focus on operations that trigger large invalidations
  triggerLargeInvalidation();
  
  sleep(0.5); // 2 ops/sec per VU = 200 ops/sec at 100 VUs
}

function triggerLargeInvalidation() {
  // Create contract - this triggers contract analytics invalidation
  // With observers, this invalidates:
  // - Contract analytics (tenant, landlord, admin roles)
  // - Potentially multiple cache keys
  
  const payload = JSON.stringify({
    listing_id: Math.floor(Math.random() * 100) + 1,
    start_date: '2026-04-01',
    end_date: '2027-04-01',
    rent_amount: 120000,
    billing_cycle: 'monthly',
    payment_day: Math.floor(Math.random() * 28) + 1,
  });
  
  const startTime = Date.now();
  
  const res = http.post(`${BASE_URL}/api/contracts`, payload, {
    headers: {
      'Authorization': `Bearer ${LANDLORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { operation: 'write', invalidation: 'triggered' },
  });
  
  const writeTime = Date.now() - startTime;
  writeBlockTime.add(writeTime);
  
  const success = check(res, {
    'contract created': (r) => r.status === 201,
    'write not blocked': (r) => writeTime < 100, // Must be fast
  });
  
  if (success && writeTime < 100) {
    // Assume async invalidation was used (write was fast)
    asyncInvalidations.add(1);
  } else if (success && writeTime >= 100) {
    // Slower write might indicate sync invalidation
    syncInvalidations.add(1);
  }
  
  // Estimate queue depth (rough heuristic)
  queueDepth.add(Math.max(0, asyncInvalidations.value - syncInvalidations.value * 2));
}

// Additional helper: Trigger ledger batch
export function triggerLedgerBatch() {
  // Create multiple ledger entries rapidly
  for (let i = 0; i < 5; i++) {
    const payload = JSON.stringify({
      contract_id: Math.floor(Math.random() * 100) + 1,
      entry_type: 'RENT',
      amount_cents: 100000,
      due_date: `2026-04-${String(i + 1).padStart(2, '0')}`,
    });
    
    http.post(`${BASE_URL}/api/ledger`, payload, {
      headers: {
        'Authorization': `Bearer ${LANDLORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: { operation: 'batch_write' },
    });
  }
  
  asyncInvalidations.add(5);
}
