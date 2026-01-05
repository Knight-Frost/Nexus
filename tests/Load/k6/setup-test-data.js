// Setup script to extract real UUIDs from the API
import http from 'k6/http';

const ADMIN_TOKEN = '5|AUW0tCCsApL2uo7lAFGwyO5ycPn3BQVVZEIOYNjR910a5a6f';
const TENANT_TOKEN = '6|bUT48inrKaCr89q5xW17sZUnXQzNzEpIcYTWa0Mx1f132edd';
const LANDLORD_TOKEN = '7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1';
const BASE_URL = 'http://127.0.0.1:8000';

export function setup() {
  console.log('⚙️  Fetching real resource IDs from API...');
  
  // Fetch contracts (landlord) - returns array directly
  const contractsRes = http.get(`${BASE_URL}/api/landlord/contracts`, {
    headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` }
  });
  
  let contractIds = [];
  if (contractsRes.status === 200) {
    const contracts = contractsRes.json();
    if (Array.isArray(contracts)) {
      contractIds = contracts.map(c => c.id);
    }
  }
  
  // Fetch ledger entries (landlord) - returns array directly
  const ledgerRes = http.get(`${BASE_URL}/api/landlord/ledger`, {
    headers: { 'Authorization': `Bearer ${LANDLORD_TOKEN}` }
  });
  
  let ledgerIds = [];
  if (ledgerRes.status === 200) {
    const entries = ledgerRes.json();
    if (Array.isArray(entries)) {
      ledgerIds = entries.map(e => e.id);
    }
  }
  
  // Fetch notifications (tenant)
  const notifRes = http.get(`${BASE_URL}/api/notifications`, {
    headers: { 'Authorization': `Bearer ${TENANT_TOKEN}` }
  });
  
  let notificationIds = [];
  if (notifRes.status === 200) {
    const body = notifRes.json();
    const notifs = Array.isArray(body) ? body : (body.data || body.notifications || []);
    notificationIds = notifs.map(n => n.id);
  }
  
  console.log(`✅ Loaded ${contractIds.length} contracts`);
  console.log(`✅ Loaded ${ledgerIds.length} ledger entries`);
  console.log(`✅ Loaded ${notificationIds.length} notifications`);
  
  return {
    contractIds,
    ledgerIds,
    notificationIds,
    tokens: {
      admin: ADMIN_TOKEN,
      tenant: TENANT_TOKEN,
      landlord: LANDLORD_TOKEN
    }
  };
}

export default function(data) {
  // Verify setup worked
  if (!data.contractIds || data.contractIds.length === 0) {
    console.error('❌ No contracts loaded - check seeded data');
  } else {
    console.log(`✅ Setup successful - ready for load testing`);
  }
}
