#!/bin/bash
cd ~/Documents/Nexus

ADMIN_TOKEN="5|AUW0tCCsApL2uo7lAFGwyO5ycPn3BQVVZEIOYNjR910a5a6f"
TENANT_TOKEN="6|bUT48inrKaCr89q5xW17sZUnXQzNzEpIcYTWa0Mx1f132edd"
LANDLORD_TOKEN="7|GPsPnwhydWIEjPBunyDGxNHFLlVxUf2fbV8buKXg6f61d7b1"

for script in tests/Load/k6/*.js; do
    sed -i '' "s/const ADMIN_TOKEN = '.*';/const ADMIN_TOKEN = '${ADMIN_TOKEN}';/g" "$script"
    sed -i '' "s/const TENANT_TOKEN = '.*';/const TENANT_TOKEN = '${TENANT_TOKEN}';/g" "$script"
    sed -i '' "s/const LANDLORD_TOKEN = '.*';/const LANDLORD_TOKEN = '${LANDLORD_TOKEN}';/g" "$script"
done

echo "✅ k6 scripts updated with new tokens!"
grep "const ADMIN_TOKEN" tests/Load/k6/1-realistic-load.js
