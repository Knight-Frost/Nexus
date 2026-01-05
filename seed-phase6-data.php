<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\{User, Property, Unit, Listing, Contract, LedgerEntry};
use App\Enums\{PropertyType, ListingStatus, ContractStatus, LedgerType, LedgerStatus};

echo "🌱 Seeding Phase 6 test data...\n\n";

$landlord = User::where('email', 'phase6-landlord@test.com')->first();
$tenant = User::where('email', 'phase6-tenant@test.com')->first();

if (!$landlord || !$tenant) die("❌ Test users not found!\n");

echo "Creating properties...\n";
$property1 = Property::create([
    'landlord_id' => $landlord->id, 'name' => 'Test Building A',
    'property_type' => PropertyType::APARTMENT, 'street_address' => '123 Test Street',
    'city' => 'Test City', 'state' => 'TS', 'zip_code' => '12345', 'country' => 'USA',
]);

$property2 = Property::create([
    'landlord_id' => $landlord->id, 'name' => 'Test Building B',
    'property_type' => PropertyType::MULTI_FAMILY, 'street_address' => '456 Test Avenue',
    'city' => 'Test City', 'state' => 'TS', 'zip_code' => '12346', 'country' => 'USA',
]);

echo "Creating units...\n";
$unit1 = Unit::create(['property_id' => $property1->id, 'unit_number' => '101', 'bedrooms' => 2, 'bathrooms' => 1, 'square_feet' => 800, 'rent_amount' => 1500, 'security_deposit' => 1500]);
$unit2 = Unit::create(['property_id' => $property1->id, 'unit_number' => '102', 'bedrooms' => 1, 'bathrooms' => 1, 'square_feet' => 600, 'rent_amount' => 1000, 'security_deposit' => 1000]);
$unit3 = Unit::create(['property_id' => $property2->id, 'unit_number' => '201', 'bedrooms' => 3, 'bathrooms' => 2, 'square_feet' => 1200, 'rent_amount' => 2000, 'security_deposit' => 2000]);

echo "Creating listings...\n";
$listing1 = Listing::create(['unit_id' => $unit1->id, 'landlord_id' => $landlord->id, 'title' => 'Cozy 2BR Apartment', 'description' => 'Great location', 'status' => ListingStatus::ACTIVE, 'published_at' => now()->subDays(30)]);
$listing2 = Listing::create(['unit_id' => $unit2->id, 'landlord_id' => $landlord->id, 'title' => 'Studio Apartment', 'description' => 'Perfect for singles', 'status' => ListingStatus::ACTIVE, 'published_at' => now()->subDays(15)]);
$listing3 = Listing::create(['unit_id' => $unit3->id, 'landlord_id' => $landlord->id, 'title' => 'Spacious 3BR', 'description' => 'Family friendly', 'status' => ListingStatus::ACTIVE, 'published_at' => now()->subDays(45)]);

echo "Creating contracts...\n";
$contract1 = Contract::create(['listing_id' => $listing1->id, 'landlord_id' => $landlord->id, 'tenant_id' => $tenant->id, 'rent_amount' => 1500, 'payment_day' => 1, 'start_date' => now()->subMonths(3), 'end_date' => now()->addMonths(9), 'status' => ContractStatus::ACTIVE]);
$contract2 = Contract::create(['listing_id' => $listing2->id, 'landlord_id' => $landlord->id, 'tenant_id' => $tenant->id, 'rent_amount' => 1000, 'payment_day' => 1, 'start_date' => now()->subMonths(2), 'end_date' => now()->addMonths(10), 'status' => ContractStatus::ACTIVE]);

echo "Creating ledger entries...\n";
for ($i = 0; $i < 3; $i++) {
    LedgerEntry::create(['contract_id' => $contract1->id, 'tenant_id' => $tenant->id, 'landlord_id' => $landlord->id, 'type' => LedgerType::RENT, 'amount_cents' => 150000, 'due_date' => now()->subMonths(3 - $i), 'status' => LedgerStatus::PAID]);
}
for ($i = 0; $i < 2; $i++) {
    LedgerEntry::create(['contract_id' => $contract2->id, 'tenant_id' => $tenant->id, 'landlord_id' => $landlord->id, 'type' => LedgerType::RENT, 'amount_cents' => 100000, 'due_date' => now()->subMonths(2 - $i), 'status' => LedgerStatus::PAID]);
}
LedgerEntry::create(['contract_id' => $contract1->id, 'tenant_id' => $tenant->id, 'landlord_id' => $landlord->id, 'type' => LedgerType::RENT, 'amount_cents' => 150000, 'due_date' => now(), 'status' => LedgerStatus::PENDING]);

echo "\n✅ Test data seeded!\n\nSummary:\n- Properties: 2\n- Units: 3\n- Listings: 3\n- Contracts: 2\n- Ledger Entries: 6\n\n🎯 Ready for Phase 6!\n";
