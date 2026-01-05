/**
 * Phase 6 - Scenario 4: Redis Cache Stress Testing
 * 
 * Purpose: Validate cache behavior under sustained Redis pressure
 * 
 * Traffic Pattern:
 * - Ramp up: 100 VUs - 2 min
 * - Sustain: 500 VUs - 15 min (high cache read rate)
 * - Ramp down: 0 VUs - 2 min
 * 
 * Operations Mix:
 * - 90% Analytics reads (cache hits)
 * - 10% Writes (cache invalidation)
 * 
 * What to Observe:
 * - Cache hit ratio over time
 * - Redis memory growth
 * - Cache key count growth
 * - TTL expiration correctness
 * - Read latency under cache pressure
 * 
 * Expected Outcomes:
 * - Cache hit rate > 80%
 * - Memory growth stabilizes (TTL working)
 * - No memory exhaustion
 * - Consistent read latency
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const cacheHits = new Counter('cache_hits_estimated');
const cacheMisses = new Counter('cache_misses_estimated');
const readLatency = new Trend('cache_read_latency');
const cacheHitRate = new Rate('cache_hit_rate');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '15m', target: 500 }, // Sustained cache pressure
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'cache_read_latency': ['p(95)<200'], // Fast reads
    'cache_hit_rate': ['rate>0.80'],     // 80%+ hit rate
  },
};

const BASE_URL = 'http://localhost:8000';
const TOKENS = [
  '',
  '',
  'tenant-token-2',
  '',
];

export default function () {
  if (Math.random() < 0.9) {
    // 90% reads
    performCachedRead();
  } else {
    // 10% writes (invalidate)
    performWrite();
  }
  
  sleep(Math.random() * 0.5); // 0-0.5s think time
}

function performCachedRead() {
  const endpoints = [
    '/api/analytics/contracts',
    '/api/analytics/financial',
    '/api/analytics/platform',
    '/api/analytics/notifications',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
  
  // Add query params to create different cache keys
  const params = new URLSearchParams({
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    _cache_test: String(Math.floor(Math.random() * 50)), // 50 different cache variants
  });
  
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}${endpoint}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    tags: { operation: 'cache_read' },
  });
  
  const duration = Date.now() - startTime;
  readLatency.add(duration);
  
  // Estimate cache hit based on response time
  // Cached responses are typically <50ms
  // Uncached responses are typically >100ms
  const isCacheHit = duration < 50;
  
  if (isCacheHit) {
    cacheHits.add(1);
    cacheHitRate.add(true);
  } else {
    cacheMisses.add(1);
    cacheHitRate.add(false);
  }
  
  check(res, {
    'read successful': (r) => r.status === 200,
    'response has data': (r) => r.json('data') !== undefined,
  });
}

function performWrite() {
  // Contract write triggers cache invalidation
  const payload = JSON.stringify({
    listing_id: Math.floor(Math.random() * 100) + 1,
    start_date: '2026-05-01',
    end_date: '2027-05-01',
  });
  
  http.post(`${BASE_URL}/api/contracts`, payload, {
    headers: {
      'Authorization': 'Bearer ',
      'Content-Type': 'application/json',
    },
    tags: { operation: 'cache_invalidate' },
  });
}

// Export a summary function
export function handleSummary(data) {
  const cacheHitCount = data.metrics.cache_hits_estimated.values.count || 0;
  const cacheMissCount = data.metrics.cache_misses_estimated.values.count || 0;
  const total = cacheHitCount + cacheMissCount;
  const hitRate = total > 0 ? (cacheHitCount / total * 100).toFixed(2) : 0;
  
  console.log(`\n=== CACHE PERFORMANCE SUMMARY ===`);
  console.log(`Cache Hits: ${cacheHitCount}`);
  console.log(`Cache Misses: ${cacheMissCount}`);
  console.log(`Hit Rate: ${hitRate}%`);
  console.log(`Avg Read Latency: ${data.metrics.cache_read_latency.values.avg.toFixed(2)}ms`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
