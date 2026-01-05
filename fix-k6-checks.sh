#!/bin/bash
cd ~/Documents/Nexus/tests/Load/k6

# Fix analytics check - change 'data' to 'analytics'
for file in *.js; do
    sed -i '' "s/'analytics has data': (r) => r.json('data') !== undefined/'analytics has data': (r) => r.json('analytics') !== undefined/g" "$file"
done

echo "✅ Fixed k6 analytics checks!"
