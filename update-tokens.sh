#!/bin/bash
cd ~/Documents/Nexus

ADMIN_TOKEN="2|dGBxW6cPUhZ5ZnxfTNW2toHWXFWjXLZy3e70Kb5v328b62ad"
TENANT_TOKEN="3|nbB0Y7IoQodatWrmyI6ReYMQOefd0AkjiI0XbOsA73600356"
LANDLORD_TOKEN="4|nc9D28H4I50IU6ASsJTP98WCU7yQpXQMFXi7ERoT04ecf474"

for script in tests/Load/k6/*.js; do
    sed -i '' "s/const ADMIN_TOKEN = '';/const ADMIN_TOKEN = '${ADMIN_TOKEN}';/g" "$script"
    sed -i '' "s/const TENANT_TOKEN = '';/const TENANT_TOKEN = '${TENANT_TOKEN}';/g" "$script"
    sed -i '' "s/const LANDLORD_TOKEN = '';/const LANDLORD_TOKEN = '${LANDLORD_TOKEN}';/g" "$script"
done

echo "✅ Tokens updated!"
grep "const ADMIN_TOKEN" tests/Load/k6/1-realistic-load.js
