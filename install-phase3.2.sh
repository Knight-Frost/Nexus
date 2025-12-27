#!/bin/bash

# Nexus Phase 3.2 - Ledger Installation Script
# Automates the integration of immutable ledger system

set -e

echo "================================================"
echo "  NEXUS PHASE 3.2 - LEDGER INSTALLATION"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in Laravel project
if [ ! -f "artisan" ]; then
    echo -e "${RED}ERROR: Must run from Laravel project root${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Detected Laravel project${NC}"
echo ""

# Check if Phase 3.2 files are extracted
if [ ! -d "nexus-phase3.2-ledger" ]; then
    echo -e "${RED}ERROR: Phase 3.2 files not found${NC}"
    echo "Please extract nexus-phase3.2-ledger.tar.gz first"
    exit 1
fi

SOURCE_DIR="nexus-phase3.2-ledger"

echo "Step 1: Creating directories..."
mkdir -p app/Enums
mkdir -p app/Services
mkdir -p app/Observers
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

echo "Step 2: Copying Enums..."
cp "$SOURCE_DIR/app/Enums/LedgerType.php" app/Enums/
cp "$SOURCE_DIR/app/Enums/LedgerStatus.php" app/Enums/
echo -e "${GREEN}✓ Enums copied${NC}"
echo ""

echo "Step 3: Copying Migration..."
cp "$SOURCE_DIR/database/migrations/2024_01_01_000015_create_ledger_entries_table.php" database/migrations/
echo -e "${GREEN}✓ Migration copied${NC}"
echo ""

echo "Step 4: Copying Model..."
cp "$SOURCE_DIR/app/Models/LedgerEntry.php" app/Models/
echo -e "${GREEN}✓ Model copied${NC}"
echo ""

echo "Step 5: Copying Service..."
cp "$SOURCE_DIR/app/Services/LedgerService.php" app/Services/
echo -e "${GREEN}✓ Service copied${NC}"
echo ""

echo "Step 6: Copying Observer..."
cp "$SOURCE_DIR/app/Observers/ContractObserver.php" app/Observers/
echo -e "${GREEN}✓ Observer copied${NC}"
echo ""

echo "Step 7: Copying Policy..."
cp "$SOURCE_DIR/app/Policies/LedgerEntryPolicy.php" app/Policies/
echo -e "${GREEN}✓ Policy copied${NC}"
echo ""

echo "Step 8: Copying Form Request..."
cp "$SOURCE_DIR/app/Http/Requests/GenerateLateFeeRequest.php" app/Http/Requests/
echo -e "${GREEN}✓ Form Request copied${NC}"
echo ""

echo "Step 9: Copying Controllers..."
cp "$SOURCE_DIR/app/Http/Controllers/Tenant/TenantLedgerController.php" app/Http/Controllers/Tenant/
cp "$SOURCE_DIR/app/Http/Controllers/Landlord/LandlordLedgerController.php" app/Http/Controllers/Landlord/
cp "$SOURCE_DIR/app/Http/Controllers/Admin/AdminLedgerController.php" app/Http/Controllers/Admin/
echo -e "${GREEN}✓ Controllers copied${NC}"
echo ""

echo "Step 10: Copying Factory..."
cp "$SOURCE_DIR/database/factories/LedgerEntryFactory.php" database/factories/
echo -e "${GREEN}✓ Factory copied${NC}"
echo ""

echo "Step 11: Copying Tests..."
cp "$SOURCE_DIR/tests/Feature/LedgerWorkflowTest.php" tests/Feature/
echo -e "${GREEN}✓ Tests copied${NC}"
echo ""

echo "Step 12: Updating Composer autoload..."
composer dump-autoload -q
echo -e "${GREEN}✓ Composer autoload updated${NC}"
echo ""

echo "Step 13: Running migration..."
php artisan migrate --force
echo -e "${GREEN}✓ Migration complete${NC}"
echo ""

echo "================================================"
echo -e "${YELLOW}  MANUAL STEPS REQUIRED${NC}"
echo "================================================"
echo ""
echo "1. Register Observer in app/Providers/EventServiceProvider.php:"
echo "   Add to boot() method:"
echo "   Contract::observe(ContractObserver::class);"
echo ""
echo "2. Register Policy in app/Providers/AuthServiceProvider.php:"
echo "   Add to \$policies array:"
echo "   \\App\\Models\\LedgerEntry::class => \\App\\Policies\\LedgerEntryPolicy::class,"
echo ""
echo "3. Add routes to routes/api.php:"
echo "   See: nexus-phase3.2-ledger/routes/api_ledger.php"
echo ""
echo "4. Run tests:"
echo "   php artisan test --filter=LedgerWorkflowTest"
echo ""
echo "================================================"
echo -e "${GREEN}  PHASE 3.2 FILES INSTALLED${NC}"
echo "================================================"
