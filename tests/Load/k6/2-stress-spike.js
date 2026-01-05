/**
 * Phase 6 - Scenario 2: Stress Spike Testing
 * 
 * Purpose: Discover system breaking points and degradation patterns
 * 
 * Traffic Pattern:
 * - Baseline: 50 VUs - 2 min
 * - Spike 1: 500 VUs for 30s (10x normal)
 * - Recovery 1: 50 VUs - 2 min
 * - Spike 2: 1000 VUs for 30s (20x normal)
 * - Recovery 2: 50 VUs - 2 min
 * - Spike 3: 2000 VUs for 1 min (40x normal)
 * - Final recovery: Ramp down
 * 
 * Operations Mix:
 * - 60% Writes (to stress invalidation)
 * - 40% Reads
 * 
 * Expected Observations:
 * - Latency degradation pattern
 * - Error rate under extreme load
 * - Recovery time after spike
 * - Async vs sync invalidation ratio
 * - Queue backlog growth
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const writeCounter = new Counter('writes_total');
const invalidationCounter = new Counter('invalidations_triggered');
const p99Latency = new Trend('p99_latency');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Baseline
    { duration: '30s', target: 500 },  // Spike 1
    { duration: '2m', target: 50 },    // Recovery 1
    { duration: '30s', target: 1000 }, // Spike 2
    { duration: '2m', target: 50 },    // Recovery 2
    { duration: '1m', target: 2000 },  // Spike 3
    { duration: '3m', target: 0 },     // Final recovery
  ],
  thresholds: {
    'http_req_duration{scenario:spike}': ['p(99)<5000'], // Allow degradation
    'http_req_failed': ['rate<0.05'], // Allow 5% errors under stress
  },
};

const BASE_URL = 'http://localhost:8000';
const LANDLORD_TOKEN = '7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1';
const TENANT_TOKEN = '6|bUT48inrKaCr89q5xW17sZUnXQzNzEpIcYTWa0Mx1f132edd';

export default function () {
  // 60% writes, 40% reads
  if (Math.random() < 0.6) {
    performWrite();
  } else {
    performRead();
  }
  
  // Minimal sleep during stress
  sleep(0.1);
}

function performWrite() {
  const writeType = Math.random();
  
  if (writeType < 0.4) {
    // Contract creation (triggers invalidation)
    createContract();
  } else if (writeType < 0.7) {
    // Ledger entry (triggers invalidation)
    createLedgerEntry();
  } else {
    // Notification (triggers invalidation)
    createNotification();
  }
}

function createContract() {
  const payload = JSON.stringify({
    listing_id: Math.floor(Math.random() * 1000) + 1,
    start_date: '2026-03-01',
    end_date: '2027-03-01',
    rent_amount: 150000,
  });
  
  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/contracts`, payload, {
    headers: {
      'Authorization': `Bearer ${LANDLORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { scenario: 'spike', operation: 'contract_write' },
  });
  
  const duration = Date.now() - startTime;
  p99Latency.add(duration);
  writeCounter.add(1);
  
  if (res.status === 201) {
    invalidationCounter.add(1);
  }
  
  check(res, {
    'write completed': (r) => r.status === 201 || r.status === 422,
    'write not 500': (r) => r.status !== 500,
  });
}

function createLedgerEntry() {
  const payload = JSON.stringify({
    contract_id: Math.floor(Math.random() * 1000) + 1,
    entry_type: 'RENT',
    amount_cents: 100000,
    due_date: '2026-03-15',
  });
  
  const res = http.post(`${BASE_URL}/api/ledger`, payload, {
    headers: {
      'Authorization': `Bearer ${LANDLORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { scenario: 'spike', operation: 'ledger_write' },
  });
  
  writeCounter.add(1);
  
  if (res.status === 201) {
    invalidationCounter.add(1);
  }
}

function createNotification() {
  const payload = JSON.stringify({
    user_id: Math.floor(Math.random() * 100) + 1,
    type: 'PAYMENT_RECEIVED',
    content: 'Test notification',
  });
  
  const res = http.post(`${BASE_URL}/api/notifications`, payload, {
    headers: {
      'Authorization': `Bearer ${LANDLORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { scenario: 'spike', operation: 'notification_write' },
  });
  
  writeCounter.add(1);
}

function performRead() {
  const endpoint = [
    '/api/analytics/contracts',
    '/api/analytics/financial',
    '/api/contracts',
  ][Math.floor(Math.random() * 3)];
  
  http.get(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${TENANT_TOKEN}` },
    tags: { scenario: 'spike', operation: 'read' },
  });
}
