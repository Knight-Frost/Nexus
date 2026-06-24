<?php

namespace Database\Seeders\Dev;

use App\Models\Property;
use App\Models\Unit;

/**
 * PropertySeeder — properties and their units.
 *
 * Creates the 10 Ghana-located properties (owned by the verified, full-feature
 * landlords) and the 20 DISTINCT rental units (studio → family compound; no
 * clones). Money on units is stored in decimal major units per the schema;
 * availability is taken from the catalog so it stays consistent with the
 * contracts seeded later (occupied/pending units are the ones under contract).
 */
class PropertySeeder extends DevSeeder
{
    public function run(): void
    {
        $propertyIds = $this->seedProperties();
        $this->seedUnits($propertyIds);

        $this->command?->info(
            '  ✓ Properties: '.count(SeedCatalog::PROPERTIES).' properties, '
            .count(SeedCatalog::UNITS).' distinct units.'
        );
    }

    /**
     * @return array<string,int> property catalog key => property id
     */
    protected function seedProperties(): array
    {
        $ids = [];

        foreach (SeedCatalog::PROPERTIES as $p) {
            $landlord = $this->user($p['landlord']);

            $property = Property::updateOrCreate(
                ['landlord_id' => $landlord->id, 'name' => $p['name']],
                [
                    'property_type' => $p['type'],
                    'street_address' => $p['street'],
                    'city' => $p['city'],
                    'state' => $p['state'],      // Ghana 2-char region code
                    'zip_code' => $p['zip'],
                    'country' => 'GH',
                    'year_built' => $p['year'],
                    'description' => $p['desc'],
                    'is_active' => true,
                ],
            );

            $ids[$p['key']] = $property->id;
        }

        return $ids;
    }

    /**
     * @param  array<string,int>  $propertyIds
     */
    protected function seedUnits(array $propertyIds): void
    {
        foreach (SeedCatalog::UNITS as $u) {
            Unit::updateOrCreate(
                ['property_id' => $propertyIds[$u['property']], 'unit_number' => $u['number']],
                [
                    'internal_name' => $u['type'],   // captures the distinct unit character
                    'bedrooms' => $u['bedrooms'],
                    'bathrooms' => $u['bathrooms'],
                    'square_feet' => $u['sqft'],
                    'rent_amount' => $u['rent'],     // GH₵ major units (decimal column)
                    'security_deposit' => $u['deposit'],
                    'availability_status' => $u['availability'],
                    'available_from' => $u['availability'] === 'available' ? now()->addDays(7) : null,
                    'amenities' => $u['amenities'],
                    'is_active' => true,
                ],
            );
        }
    }
}
