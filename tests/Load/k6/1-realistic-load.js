/**
 * Phase 6 - Scenario 1: Realistic Load Validation
 * 
 * Purpose: Validate system under expected production traffic
 * 
 * Traffic Pattern:
 * - Stage 1: Ramp up to 50 VUs (normal load) - 2 min
 * - Stage 2: Sustain 50 VUs - 5 min
 * - Stage 3: Ramp up to 200 VUs (peak load) - 3 min
 * - Stage 4: Sustain 200 VUs - 10 min
 * - Stage 5: Ramp down - 2 min
 * 
 * Operations Mix:
 * - 40% Analytics reads (contracts, financial, platform)
 * - 30% Contract operations
 * - 20% Ledger operations
 * - 10% Notification operations
 * 
 * Expected Outcomes:
 * - p95 latency < 500ms under normal load
 * - p95 latency < 1000ms under peak load
 * - Error rate < 0.1%
 * - Cache hit rate > 85%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const analyticsLatency = new Trend('analytics_latency');
const writeLatency = new Trend('write_latency');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to normal
    { duration: '5m', target: 50 },   // Sustain normal
    { duration: '3m', target: 200 },  // Ramp to peak
    { duration: '10m', target: 200 }, // Sustain peak
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% under 1s
    'http_req_failed': ['rate<0.01'],    // <1% errors
    'errors': ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:8000';

// Test users (create these via seeder or use existing)
const ADMIN_TOKEN = '5|AUW0tCCsApL2uo7lAFGwyO5ycPn3BQVVZEIOYNjR910a5a6f';
const TENANT_TOKEN = '6|bUT48inrKaCr89q5xW17sZUnXQzNzEpIcYTWa0Mx1f132edd';
const LANDLORD_TOKEN = '7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1';

export default function () {
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 40% - Analytics reads
    analyticsRead();
  } else if (operation < 0.7) {
    // 30% - Contract operations
    contractOperation();
  } else if (operation < 0.9) {
    // 20% - Ledger operations
    ledgerOperation();
  } else {
    // 10% - Notification operations
    notificationOperation();
  }
  
  sleep(Math.random() * 2 + 1); // 1-3 second think time
}

function analyticsRead() {
  const endpoints = [
    '/api/analytics/contracts',
    '/api/analytics/financial',
    '/api/analytics/platform',
    '/api/analytics/notifications',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const token = Math.random() < 0.1 ? ADMIN_TOKEN : 
                (Math.random() < 0.5 ? TENANT_TOKEN : LANDLORD_TOKEN);
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  };
  
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}${endpoint}`, params);
  const duration = Date.now() - startTime;
  
  analyticsLatency.add(duration);
  
  const success = check(res, {
    'analytics read status 200': (r) => r.status === 200,
    'analytics has data': (r) => r.json('analytics') !== undefined,
  });
  
  errorRate.add(!success);
}

function contractOperation() {
  // Mix of reads (80%) and writes (20%)
  if (Math.random() < 0.8) {
    // Read contract
    const res = http.get(`${BASE_URL}/api/contracts/1`, {
      headers: { 'Authorization': `Bearer ${TENANT_TOKEN}` },
    });
    
    check(res, { 'contract read OK': (r) => r.status === 200 });
  } else {
    // Create contract (write - triggers invalidation)
    const startTime = Date.now();
    const payload = JSON.stringify({
      listing_id: Math.floor(Math.random() * 100) + 1,
      start_date: '2026-02-01',
      end_date: '2027-02-01',
    });
    
    const res = http.post(`${BASE_URL}/api/contracts`, payload, {
      headers: {
        'Authorization': `Bearer ${LANDLORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const duration = Date.now() - startTime;
    writeLatency.add(duration);
    
    check(res, { 'contract write OK': (r) => r.status === 201 });
  }
}

function ledgerOperation() {
  // Ledger reads (triggers cache, potential invalidation via observers)
  const res = http.get(`${BASE_URL}/api/ledger?user_id=1`, {
    headers: { 'Authorization': `Bearer ${TENANT_TOKEN}` },
  });
  
  check(res, { 'ledger read OK': (r) => r.status === 200 });
}

function notificationOperation() {
  // Notification reads and marks as read (writes)
  if (Math.random() < 0.7) {
    const res = http.get(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${TENANT_TOKEN}` },
    });
    
    check(res, { 'notifications read OK': (r) => r.status === 200 });
  } else {
    const res = http.post(`${BASE_URL}/api/notifications/1/read`, null, {
      headers: { 'Authorization': `Bearer ${TENANT_TOKEN}` },
    });
    
    check(res, { 'mark read OK': (r) => r.status === 200 });
  }
}
