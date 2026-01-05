/**
 * Phase 6 - Scenario 6: Sustained Overload Testing
 * 
 * Purpose: Discover long-term degradation patterns
 * 
 * Traffic Pattern:
 * - Warm-up: 50 VUs - 2 min
 * - Overload: 400 VUs - 30 min
 * - Cool-down: 0 VUs - 5 min
 * 
 * Operations Mix:
 * - 50% Writes
 * - 50% Reads
 * 
 * What to Observe:
 * - Memory leaks
 * - Queue depth over time
 * - Latency degradation patterns
 * - Error accumulation
 * - System stability
 * - Resource exhaustion
 * 
 * Expected Outcomes:
 * - System remains stable
 * - No memory leaks
 * - Queue eventually reaches steady state
 * - Latency degrades but doesn't collapse
 * - No crashes or fatal errors
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const writeLatencyTrend = new Trend('write_latency_over_time');
const readLatencyTrend = new Trend('read_latency_over_time');
const errorAccumulation = new Counter('cumulative_errors');
const memoryPressure = new Rate('memory_pressure_indicator');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Warm-up
    { duration: '30m', target: 400 }, // Sustained overload
    { duration: '5m', target: 0 },    // Cool-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // Allow degradation but not collapse
    'http_req_failed': ['rate<0.10'],    // Max 10% error rate
    'cumulative_errors': ['count<1000'], // Bounded errors
  },
};

const BASE_URL = 'http://localhost:8000';
const TOKENS = {
  landlord: '',
  tenant: '',
  admin: '',
};

export default function () {
  const elapsed = __ITER / 100; // Rough time estimate
  const phase = elapsed < 2 ? 'warmup' : 
                elapsed < 32 ? 'overload' : 'cooldown';
  
  if (Math.random() < 0.5) {
    performWrite(phase);
  } else {
    performRead(phase);
  }
  
  sleep(0.1); // Minimal sleep for sustained pressure
}

function performWrite(phase) {
  const operations = [
    createContract,
    createLedgerEntry,
    createNotification,
  ];
  
  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation(phase);
}

function createContract(phase) {
  const payload = JSON.stringify({
    listing_id: Math.floor(Math.random() * 1000) + 1,
    start_date: '2026-07-01',
    end_date: '2027-07-01',
    rent_amount: 100000 + Math.floor(Math.random() * 50000),
  });
  
  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/contracts`, payload, {
    headers: {
      'Authorization': `Bearer ${TOKENS.landlord}`,
      'Content-Type': 'application/json',
    },
    tags: { 
      operation: 'contract_write',
      phase: phase,
    },
  });
  
  const duration = Date.now() - startTime;
  writeLatencyTrend.add(duration);
  
  const success = check(res, {
    'write OK': (r) => r.status === 201 || r.status === 422,
  });
  
  if (!success) {
    errorAccumulation.add(1);
  }
  
  // Memory pressure indicator (slow writes suggest backpressure)
  memoryPressure.add(duration > 500);
}

function createLedgerEntry(phase) {
  const payload = JSON.stringify({
    contract_id: Math.floor(Math.random() * 1000) + 1,
    entry_type: 'RENT',
    amount_cents: 100000,
    due_date: '2026-07-15',
  });
  
  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/ledger`, payload, {
    headers: {
      'Authorization': `Bearer ${TOKENS.landlord}`,
      'Content-Type': 'application/json',
    },
    tags: { operation: 'ledger_write', phase: phase },
  });
  
  writeLatencyTrend.add(Date.now() - startTime);
  
  if (res.status !== 201 && res.status !== 422) {
    errorAccumulation.add(1);
  }
}

function createNotification(phase) {
  const payload = JSON.stringify({
    user_id: Math.floor(Math.random() * 100) + 1,
    type: 'PAYMENT_REMINDER',
    content: 'Sustained overload test notification',
  });
  
  const res = http.post(`${BASE_URL}/api/notifications`, payload, {
    headers: {
      'Authorization': `Bearer ${TOKENS.landlord}`,
      'Content-Type': 'application/json',
    },
    tags: { operation: 'notification_write', phase: phase },
  });
  
  if (res.status !== 201) {
    errorAccumulation.add(1);
  }
}

function performRead(phase) {
  const endpoints = [
    '/api/analytics/contracts',
    '/api/analytics/financial',
    '/api/analytics/platform',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const token = Object.values(TOKENS)[Math.floor(Math.random() * 3)];
  
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'analytics_read', phase: phase },
  });
  
  const duration = Date.now() - startTime;
  readLatencyTrend.add(duration);
  
  if (res.status !== 200) {
    errorAccumulation.add(1);
  }
}

export function handleSummary(data) {
  console.log(`\n=== SUSTAINED OVERLOAD SUMMARY ===`);
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log(`Cumulative Errors: ${data.metrics.cumulative_errors.values.count}`);
  console.log(`Avg Write Latency: ${data.metrics.write_latency_over_time.values.avg.toFixed(2)}ms`);
  console.log(`P95 Write Latency: ${data.metrics.write_latency_over_time.values['p(95)'].toFixed(2)}ms`);
  console.log(`Avg Read Latency: ${data.metrics.read_latency_over_time.values.avg.toFixed(2)}ms`);
  console.log(`P95 Read Latency: ${data.metrics.read_latency_over_time.values['p(95)'].toFixed(2)}ms`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
