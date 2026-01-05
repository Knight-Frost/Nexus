import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const ADMIN_TOKEN = '5|AUW0tCCsApL2uo7lAFGwyO5ycPn3BQVVZEIOYNjR910a5a6f';
const TENANT_TOKEN = '6|bUT48inrKaCr89q5xW17sZUnXQzNzEpIcYTWa0Mx1f132edd';
const LANDLORD_TOKEN = '7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1';
const BASE_URL = 'http://127.0.0.1:8000';

// Metrics
const errorRate = new Rate('errors');
const analyticsLatency = new Trend('analytics_latency');
const writeLatency = new Trend('write_latency');
const serverErrors = new Counter('server_errors_5xx');
const validResponses = new Counter('valid_responses');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '5m', target: 150 },
    { duration: '5m', target: 200 },
    { duration: '5m', target: 100 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'server_errors_5xx': ['count<100'],
    'errors': ['rate<0.10'],
  },
};

export function setup() {
  console.log('⚙️  Loading real resource IDs...');
  
  const contractsRes = http.get(`${BASE_URL}/api/landlord/contracts`, {
    headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` },
    tags: { name: 'setup' }
  });
  
  let contractIds = [];
  if (contractsRes.status === 200) {
    const contracts = contractsRes.json();
    if (Array.isArray(contracts)) {
      contractIds = contracts.map(c => c.id);
    }
  }
  
  const ledgerRes = http.get(`${BASE_URL}/api/landlord/ledger`, {
    headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` },
    tags: { name: 'setup' }
  });
  
  let ledgerIds = [];
  if (ledgerRes.status === 200) {
    const entries = ledgerRes.json();
    if (Array.isArray(entries)) {
      ledgerIds = entries.map(e => e.id);
    }
  }
  
  console.log(`✅ Loaded ${contractIds.length} contracts, ${ledgerIds.length} ledger entries`);
  
  if (contractIds.length === 0) {
    throw new Error('❌ No contracts found - run: php seed-phase6-data.php');
  }
  
  return { contractIds, ledgerIds };
}

function randomItem(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function(data) {
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    analyticsOperation();
  } else if (scenario < 0.5) {
    contractOperation(data.contractIds);
  } else if (scenario < 0.7) {
    ledgerOperation(data.ledgerIds);
  } else {
    notificationOperation();
  }
}

function analyticsOperation() {
  group('Analytics Read', () => {
    const endpoint = ['platform', 'financial', 'notifications'][Math.floor(Math.random() * 3)];
    const startTime = Date.now();
    
    const res = http.get(`${BASE_URL}/api/analytics/${endpoint}`, {
      headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` },
      tags: { name: `analytics_${endpoint}` }
    });
    
    analyticsLatency.add(Date.now() - startTime);
    
    const is5xx = res.status >= 500;
    const isValid = res.status === 200 || res.status === 403 || res.status === 404;
    
    check(res, {
      'analytics status valid': (r) => isValid,
      'analytics has data': (r) => {
        if (r.status !== 200) return true;
        const body = r.json();
        return body.analytics !== undefined;
      }
    });
    
    if (is5xx) {
      serverErrors.add(1);
      errorRate.add(1);
    } else if (isValid) {
      validResponses.add(1);
    }
  });
}

function contractOperation(contractIds) {
  group('Contract Operation', () => {
    if (Math.random() < 0.8 && contractIds.length > 0) {
      // Read existing contract
      const contractId = randomItem(contractIds);
      
      const res = http.get(`${BASE_URL}/api/landlord/contracts/${contractId}`, {
        headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` },
        tags: { name: 'contract_read' }
      });
      
      const is5xx = res.status >= 500;
      const isValid = res.status === 200 || res.status === 403 || res.status === 404;
      
      check(res, {
        'contract read valid': (r) => isValid
      });
      
      if (is5xx) {
        serverErrors.add(1);
        errorRate.add(1);
      } else if (isValid) {
        validResponses.add(1);
      }
    } else {
      // List contracts
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/landlord/contracts`, {
        headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` },
        tags: { name: 'contract_list' }
      });
      
      writeLatency.add(Date.now() - startTime);
      
      const is5xx = res.status >= 500;
      const isValid = res.status === 200 || res.status === 403;
      
      check(res, {
        'contract list valid': (r) => isValid
      });
      
      if (is5xx) {
        serverErrors.add(1);
        errorRate.add(1);
      } else if (isValid) {
        validResponses.add(1);
      }
    }
  });
}

function ledgerOperation(ledgerIds) {
  group('Ledger Read', () => {
    if (Math.random() < 0.5 && ledgerIds.length > 0) {
      // Read specific entry
      const ledgerId = randomItem(ledgerIds);
      const res = http.get(`${BASE_URL}/api/landlord/ledger/${ledgerId}`, {
        headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` },
        tags: { name: 'ledger_read' }
      });
      
      const is5xx = res.status >= 500;
      const isValid = res.status === 200 || res.status === 403 || res.status === 404;
      
      check(res, {
        'ledger read valid': (r) => isValid
      });
      
      if (is5xx) {
        serverErrors.add(1);
        errorRate.add(1);
      } else if (isValid) {
        validResponses.add(1);
      }
    } else {
      // List ledger
      const res = http.get(`${BASE_URL}/api/landlord/ledger`, {
        headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` },
        tags: { name: 'ledger_list' }
      });
      
      const is5xx = res.status >= 500;
      const isValid = res.status === 200 || res.status === 403;
      
      check(res, {
        'ledger list valid': (r) => isValid
      });
      
      if (is5xx) {
        serverErrors.add(1);
        errorRate.add(1);
      } else if (isValid) {
        validResponses.add(1);
      }
    }
  });
}

function notificationOperation() {
  group('Notifications', () => {
    const res = http.get(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${TENANT_TOKEN}` },
      tags: { name: 'notifications_read' }
    });
    
    const is5xx = res.status >= 500;
    const isValid = res.status === 200 || res.status === 403;
    
    check(res, {
      'notifications valid': (r) => isValid
    });
    
    if (is5xx) {
      serverErrors.add(1);
      errorRate.add(1);
    } else if (isValid) {
      validResponses.add(1);
    }
  });
}
