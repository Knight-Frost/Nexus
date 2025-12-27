#!/bin/bash

# Nexus Phase 3.1 - Contracts Installation Script
# Automates the integration of contract management system

set -e

echo "================================================"
echo "  NEXUS PHASE 3.1 - CONTRACTS INSTALLATION"
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

# Check if Phase 3.1 files are extracted
if [ ! -d "nexus-phase3-contracts" ]; then
    echo -e "${RED}ERROR: Phase 3.1 files not found${NC}"
    echo "Please extract nexus-phase3.1-contracts.tar.gz first:"
    echo "  tar -xzf nexus-phase3.1-contracts.tar.gz -C ."
    echo "  mv app nexus-phase3-contracts/"
    exit 1
fi

SOURCE_DIR="nexus-phase3-contracts"

echo "Step 1: Creating directories..."
mkdir -p app/Enums
mkdir -p app/Http/Controllers/Landlord
mkdir -p app/Http/Controllers/Tenant
mkdir -p app/Http/Controllers/Admin
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

echo "Step 2: Copying Enums..."
cp "$SOURCE_DIR/app/Enums/ContractStatus.php" app/Enums/
cp "$SOURCE_DIR/app/Enums/BillingCycle.php" app/Enums/
cp "$SOURCE_DIR/app/Enums/TerminatedBy.php" app/Enums/
echo -e "${GREEN}✓ Enums copied${NC}"
echo ""

echo "Step 3: Copying Migration..."
cp "$SOURCE_DIR/database/migrations/2024_01_01_000014_create_contracts_table.php" database/migrations/
echo -e "${GREEN}✓ Migration copied${NC}"
echo ""

echo "Step 4: Copying Model..."
cp "$SOURCE_DIR/app/Models/Contract.php" app/Models/
echo -e "${GREEN}✓ Model copied${NC}"
echo ""

echo "Step 5: Copying Policy..."
cp "$SOURCE_DIR/app/Policies/ContractPolicy.php" app/Policies/
echo -e "${GREEN}✓ Policy copied${NC}"
echo ""

echo "Step 6: Copying Form Requests..."
cp "$SOURCE_DIR/app/Http/Requests/StoreContractRequest.php" app/Http/Requests/
cp "$SOURCE_DIR/app/Http/Requests/TerminateContractRequest.php" app/Http/Requests/
cp "$SOURCE_DIR/app/Http/Requests/AdminTerminateContractRequest.php" app/Http/Requests/
echo -e "${GREEN}✓ Form Requests copied${NC}"
echo ""

echo "Step 7: Copying Controllers..."
cp "$SOURCE_DIR/app/Http/Controllers/Landlord/LandlordContractController.php" app/Http/Controllers/Landlord/
cp "$SOURCE_DIR/app/Http/Controllers/Tenant/TenantContractController.php" app/Http/Controllers/Tenant/
cp "$SOURCE_DIR/app/Http/Controllers/Admin/AdminContractController.php" app/Http/Controllers/Admin/
echo -e "${GREEN}✓ Controllers copied${NC}"
echo ""

echo "Step 8: Copying Factory..."
cp "$SOURCE_DIR/database/factories/ContractFactory.php" database/factories/
echo -e "${GREEN}✓ Factory copied${NC}"
echo ""

echo "Step 9: Copying Tests..."
cp "$SOURCE_DIR/tests/Feature/ContractWorkflowTest.php" tests/Feature/
echo -e "${GREEN}✓ Tests copied${NC}"
echo ""

echo "Step 10: Updating Composer autoload..."
composer dump-autoload -q
echo -e "${GREEN}✓ Composer autoload updated${NC}"
echo ""

echo "Step 11: Running migration..."
php artisan migrate --force
echo -e "${GREEN}✓ Migration complete${NC}"
echo ""

echo "================================================"
echo -e "${YELLOW}  MANUAL STEPS REQUIRED${NC}"
echo "================================================"
echo ""
echo "1. Register Policy in app/Providers/AuthServiceProvider.php:"
echo "   Add to \$policies array:"
echo "   \\App\\Models\\Contract::class => \\App\\Policies\\ContractPolicy::class,"
echo ""
echo "2. Add routes to routes/api.php:"
echo "   See: nexus-phase3-contracts/routes/api_contracts.php"
echo ""
echo "3. Run tests:"
echo "   php artisan test --filter=ContractWorkflowTest"
echo ""
echo "================================================"
echo -e "${GREEN}  PHASE 3.1 FILES INSTALLED${NC}"
echo "================================================"
