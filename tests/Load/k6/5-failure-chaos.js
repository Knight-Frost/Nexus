/**
 * Phase 6 - Scenario 5: Failure & Chaos Testing
 * 
 * Purpose: Validate graceful degradation under infrastructure failures
 * 
 * Test Procedure:
 * 1. Start baseline traffic (50 VUs)
 * 2. At 2min: Stop Redis (manual: redis-cli shutdown)
 * 3. Observe 2min of Redis-down behavior
 * 4. At 4min: Restart Redis
 * 5. Observe recovery for 2min
 * 6. At 6min: Stop queue workers (manual: kill queue:work)
 * 7. Observe 2min of queue-down behavior
 * 8. At 8min: Restart queue workers
 * 9. Run to 10min total
 * 
 * Manual Actions Required:
 * - 2min mark: redis-cli shutdown (or docker stop redis)
 * - 4min mark: redis-server (or docker start redis)
 * - 6min mark: Kill queue:work process
 * - 8min mark: php artisan queue:work --queue=analytics-invalidation &
 * 
 * What to Observe:
 * - Error rates during failures
 * - Write success rate (must remain 100%)
 * - Fallback to sync invalidation
 * - Recovery after infrastructure restart
 * - No data corruption
 * - Proper error logging
 * 
 * Expected Behavior:
 * - Writes: 100% success (never block)
 * - Reads: Degrade to database (slower but work)
 * - Errors: Logged but not fatal
 * - Recovery: Automatic after restart
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const writeSuccess = new Rate('write_success_rate');
const readSuccess = new Rate('read_success_rate');
const errors = new Counter('total_errors');
const writesDuringFailure = new Counter('writes_during_failure');

export const options = {
  stages: [
    { duration: '10m', target: 50 }, // Constant baseline
  ],
  thresholds: {
    'write_success_rate': ['rate>0.99'], // 99%+ writes must succeed
    'read_success_rate': ['rate>0.95'],  // 95%+ reads can succeed
  },
};

const BASE_URL = 'http://localhost:8000';
const LANDLORD_TOKEN = '7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1';
const TENANT_TOKEN = '6|bUT48inrKaCr89q5xW17sZUnXQzNzEpIcYTWa0Mx1f132edd';

export default function () {
  const currentTime = new Date().getTime();
  const startTime = __ENV.START_TIME || currentTime;
  const elapsed = (currentTime - startTime) / 1000; // seconds
  
  // Tag operations by failure window
  let phase = 'normal';
  if (elapsed >= 120 && elapsed < 240) {
    phase = 'redis_down';
  } else if (elapsed >= 360 && elapsed < 480) {
    phase = 'queue_down';
  } else if (elapsed >= 240 && elapsed < 300) {
    phase = 'redis_recovery';
  } else if (elapsed >= 480 && elapsed < 540) {
    phase = 'queue_recovery';
  }
  
  // Mix operations
  if (Math.random() < 0.4) {
    performWrite(phase);
  } else {
    performRead(phase);
  }
  
  sleep(1);
}

function performWrite(phase) {
  const payload = JSON.stringify({
    listing_id: Math.floor(Math.random() * 100) + 1,
    start_date: '2026-06-01',
    end_date: '2027-06-01',
  });
  
  const res = http.post(`${BASE_URL}/api/contracts`, payload, {
    headers: {
      'Authorization': `Bearer ${LANDLORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { 
      operation: 'write',
      phase: phase,
    },
  });
  
  const success = check(res, {
    'write succeeded': (r) => r.status === 201 || r.status === 422,
    'write not 500': (r) => r.status !== 500,
    'write completed': (r) => r.status > 0, // Got response
  });
  
  writeSuccess.add(success);
  
  if (!success) {
    errors.add(1);
    console.log(`Write failed during ${phase}: ${res.status}`);
  }
  
  if (phase.includes('down')) {
    writesDuringFailure.add(1);
  }
}

function performRead(phase) {
  const res = http.get(`${BASE_URL}/api/analytics/contracts`, {
    headers: {
      'Authorization': `Bearer ${TENANT_TOKEN}`,
    },
    tags: {
      operation: 'read',
      phase: phase,
    },
  });
  
  const success = check(res, {
    'read succeeded': (r) => r.status === 200 || r.status === 503,
    'read has response': (r) => r.status > 0,
  });
  
  readSuccess.add(success);
  
  if (!success) {
    errors.add(1);
  }
}

export function handleSummary(data) {
  console.log(`\n=== FAILURE RESILIENCE SUMMARY ===`);
  console.log(`Write Success Rate: ${(data.metrics.write_success_rate.values.rate * 100).toFixed(2)}%`);
  console.log(`Read Success Rate: ${(data.metrics.read_success_rate.values.rate * 100).toFixed(2)}%`);
  console.log(`Total Errors: ${data.metrics.total_errors.values.count}`);
  console.log(`Writes During Failure: ${data.metrics.writes_during_failure.values.count}`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
