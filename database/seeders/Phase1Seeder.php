<?php

namespace Database\Seeders;

use App\Enums\ListingStatus;
use App\Enums\PropertyType;
use App\Enums\UnitAvailabilityStatus;
use App\Enums\UserType;
use App\Models\Admin;
use App\Models\Feature;
use App\Models\LandlordFeature;
use App\Models\Listing;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Phase1Seeder
 *
 * Seeds data for Phase 1 testing:
 * - 1 Super Admin
 * - 2 Landlords (1 verified, 1 unverified)
 * - 3 Tenants
 * - 3 Properties with units
 * - 5 Listings (various statuses)
 * - Core features
 */
class Phase1Seeder extends Seeder
{
    public function run(): void
    {
        // Create Super Admin
        $admin = Admin::create([
            'email' => 'admin@nexus.com',
            'password' => Hash::make('password'),
            'name' => 'System Administrator',
            'is_super_admin' => true,
            'is_active' => true,
        ]);

        echo "✓ Created Super Admin: admin@nexus.com\n";

        // Create Landlords
        $landlordVerified = User::create([
            'user_type' => UserType::LANDLORD,
            'email' => 'landlord1@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'John',
            'last_name' => 'Property',
            'phone' => '0244000101',
            'identity_verified' => true,
            'identity_verified_at' => now(),
            'identity_verified_by' => 'admin@nexus.com',
            'email_verified_at' => now(),
        ]);

        $landlordUnverified = User::create([
            'user_type' => UserType::LANDLORD,
            'email' => 'landlord2@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'Jane',
            'last_name' => 'Rental',
            'phone' => '0244000102',
            'identity_verified' => false,
            'email_verified_at' => now(),
        ]);

        echo "✓ Created Landlords (1 verified, 1 unverified)\n";

        // Create Tenants
        $tenant1 = User::create([
            'user_type' => UserType::TENANT,
            'email' => 'tenant1@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'email_verified_at' => now(),
        ]);

        $tenant2 = User::create([
            'user_type' => UserType::TENANT,
            'email' => 'tenant2@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'Bob',
            'last_name' => 'Jones',
            'email_verified_at' => now(),
        ]);

        User::create([
            'user_type' => UserType::TENANT,
            'email' => 'tenant3@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'Carol',
            'last_name' => 'Williams',
            'email_verified_at' => now(),
        ]);

        echo "✓ Created 3 Tenants\n";

        // Create Properties — all in Ghana
        $property1 = Property::create([
            'landlord_id' => $landlordVerified->id,
            'name' => 'Cantonments Gardens',
            'property_type' => PropertyType::APARTMENT,
            'street_address' => '14 Independence Avenue',
            'city' => 'Cantonments',
            'state' => 'Accra',
            'zip_code' => 'GA-100',
            'year_built' => 2015,
            'description' => 'Modern apartment complex in the prestigious Cantonments neighbourhood of Accra.',
        ]);

        $property2 = Property::create([
            'landlord_id' => $landlordVerified->id,
            'name' => 'East Legon Court',
            'property_type' => PropertyType::TOWNHOUSE,
            'street_address' => '7 Boundary Road',
            'city' => 'East Legon',
            'state' => 'Accra',
            'zip_code' => 'GA-200',
            'year_built' => 2018,
            'description' => 'Premium townhouses in East Legon, close to the American Embassy and shopping.',
        ]);

        $property3 = Property::create([
            'landlord_id' => $landlordUnverified->id,
            'name' => 'Airport Residences',
            'property_type' => PropertyType::CONDO,
            'street_address' => '3 Aviation Road',
            'city' => 'Airport Residential',
            'state' => 'Accra',
            'zip_code' => 'GA-300',
            'year_built' => 2020,
            'description' => 'Luxury condos in the Airport Residential Area with panoramic views of Accra.',
        ]);

        echo "✓ Created 3 Properties\n";

        // Create Units
        $unit1 = Unit::create([
            'property_id' => $property1->id,
            'unit_number' => '101',
            'bedrooms' => 2,
            'bathrooms' => 2,
            'square_feet' => 1100,
            'rent_amount' => 3500,
            'security_deposit' => 3500,
            'availability_status' => UnitAvailabilityStatus::AVAILABLE,
            'available_from' => now()->addDays(15),
            'amenities' => ['parking', 'balcony', 'dishwasher', 'air_conditioning'],
        ]);

        $unit2 = Unit::create([
            'property_id' => $property1->id,
            'unit_number' => '205',
            'bedrooms' => 1,
            'bathrooms' => 1,
            'square_feet' => 700,
            'rent_amount' => 2800,
            'security_deposit' => 2800,
            'availability_status' => UnitAvailabilityStatus::AVAILABLE,
            'available_from' => now(),
            'amenities' => ['parking', 'dishwasher'],
        ]);

        $unit3 = Unit::create([
            'property_id' => $property2->id,
            'unit_number' => 'A',
            'bedrooms' => 3,
            'bathrooms' => 2,
            'square_feet' => 1800,
            'rent_amount' => 4200,
            'security_deposit' => 4200,
            'availability_status' => UnitAvailabilityStatus::AVAILABLE,
            'available_from' => now()->addDays(30),
            'amenities' => ['garage', 'backyard', 'washer_dryer', 'dishwasher', 'security'],
        ]);

        $unit4 = Unit::create([
            'property_id' => $property3->id,
            'unit_number' => '1202',
            'bedrooms' => 2,
            'bathrooms' => 2,
            'square_feet' => 1200,
            'rent_amount' => 5800,
            'security_deposit' => 5800,
            'availability_status' => UnitAvailabilityStatus::AVAILABLE,
            'available_from' => now()->addDays(7),
            'amenities' => ['parking', 'balcony', 'gym_access', 'pool_access', 'concierge'],
        ]);

        echo "✓ Created 4 Units\n";

        // Create Listings (various statuses for testing)
        $listing1 = Listing::create([
            'unit_id' => $unit1->id,
            'landlord_id' => $landlordVerified->id,
            'title' => 'Elegant 2BR/2BA in Cantonments, Accra',
            'description' => 'Spacious 2-bedroom apartment with modern finishes, balcony, and covered parking. Walking distance to the UN compound, embassies, and Cantonments dining.',
            'status' => ListingStatus::ACTIVE,
            'published_at' => now()->subDays(5),
            'featured' => true,
            'pets_allowed' => false,
            'lease_duration_months' => 12,
            'move_in_date' => now()->addDays(15)->toDateString(),
        ]);

        $listing2 = Listing::create([
            'unit_id' => $unit2->id,
            'landlord_id' => $landlordVerified->id,
            'title' => 'Cozy 1BR Apartment in Cantonments',
            'description' => 'Ideal starter apartment with parking and dishwasher. Quiet and secure neighbourhood, perfect for young professionals in Accra.',
            'status' => ListingStatus::ACTIVE,
            'published_at' => now()->subDays(10),
            'featured' => true,
            'pets_allowed' => true,
            'pet_policy' => 'Small pets welcome with additional deposit',
            'lease_duration_months' => 12,
            'move_in_date' => now()->toDateString(),
        ]);

        $listing3 = Listing::create([
            'unit_id' => $unit3->id,
            'landlord_id' => $landlordVerified->id,
            'title' => 'Spacious 3BR Townhouse — East Legon',
            'description' => 'Premium 3-bedroom townhouse in sought-after East Legon. Large private garden, garage, in-unit washer/dryer, and 24-hour security.',
            'status' => ListingStatus::ACTIVE,
            'published_at' => now()->subDays(3),
            'featured' => true,
            'pets_allowed' => true,
            'pet_policy' => 'Pets welcome, no additional deposit required',
            'lease_duration_months' => 12,
            'move_in_date' => now()->addDays(30)->toDateString(),
        ]);

        $listing4 = Listing::create([
            'unit_id' => $unit4->id,
            'landlord_id' => $landlordUnverified->id,
            'title' => 'Luxury Condo — Airport Residential Area',
            'description' => 'High-end 2BR condo with stunning views of Accra. Building amenities include gym, pool, and concierge service.',
            'status' => ListingStatus::DRAFT,
            'pets_allowed' => false,
            'lease_duration_months' => 12,
        ]);

        echo "✓ Created 4 Listings (3 active, 1 draft)\n";

        // Create Features
        $features = [
            [
                'key' => 'listings',
                'name' => 'Property Listings',
                'description' => 'Create and publish property listings',
                'requires_identity_verification' => false,
                'enabled_by_default' => true,
            ],
            [
                'key' => 'applications',
                'name' => 'Rental Applications',
                'description' => 'Accept and process rental applications',
                'requires_identity_verification' => true,
                'enabled_by_default' => false,
            ],
            [
                'key' => 'payments',
                'name' => 'Online Payments',
                'description' => 'Collect rent and deposits online',
                'requires_identity_verification' => true,
                'enabled_by_default' => false,
            ],
            [
                'key' => 'leases',
                'name' => 'Digital Leases',
                'description' => 'Create and sign leases digitally',
                'requires_identity_verification' => true,
                'enabled_by_default' => false,
            ],
            [
                'key' => 'maintenance',
                'name' => 'Maintenance Requests',
                'description' => 'Track and manage maintenance requests',
                'requires_identity_verification' => false,
                'enabled_by_default' => false,
            ],
        ];

        foreach ($features as $featureData) {
            Feature::create($featureData);
        }

        echo "✓ Created 5 Core Features\n";

        // Enable features for verified landlord
        $listingsFeature = Feature::where('key', 'listings')->first();
        LandlordFeature::create([
            'landlord_id' => $landlordVerified->id,
            'feature_id' => $listingsFeature->id,
            'enabled' => true,
            'enabled_by' => $admin->id,
            'enabled_at' => now(),
        ]);

        echo "✓ Enabled 'listings' feature for verified landlord\n";

        // Save some listings for tenants
        $tenant1->savedListings()->attach($listing1->id, ['notes' => 'Love the location!']);
        $tenant1->savedListings()->attach($listing2->id);
        $tenant2->savedListings()->attach($listing3->id, ['notes' => 'Perfect for my family']);

        echo "✓ Created saved listings for tenants\n";

        echo "\n";
        echo "═══════════════════════════════════════════════════════════\n";
        echo "  PHASE 1 SEEDING COMPLETE\n";
        echo "═══════════════════════════════════════════════════════════\n";
        echo "\n";
        echo "Credentials:\n";
        echo "  Admin:     admin@nexus.com / password\n";
        echo "  Landlord1: landlord1@example.com / password (verified)\n";
        echo "  Landlord2: landlord2@example.com / password (unverified)\n";
        echo "  Tenant1:   tenant1@example.com / password\n";
        echo "  Tenant2:   tenant2@example.com / password\n";
        echo "  Tenant3:   tenant3@example.com / password\n";
        echo "\n";
        echo "Data Created:\n";
        echo "  • 1 Super Admin\n";
        echo "  • 2 Landlords\n";
        echo "  • 3 Tenants\n";
        echo "  • 3 Properties (all in Accra, Ghana)\n";
        echo "  • 4 Units\n";
        echo "  • 4 Listings (3 published)\n";
        echo "  • 5 Features\n";
        echo "\n";
    }
}
