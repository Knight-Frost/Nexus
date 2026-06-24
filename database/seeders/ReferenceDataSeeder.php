<?php

namespace Database\Seeders;

use App\Models\Feature;
use Database\Seeders\Dev\SeedCatalog;
use Illuminate\Database\Seeder;

/**
 * ReferenceDataSeeder
 *
 * System/reference data that is identical in development AND production: the
 * master list of gateable platform features. Contains NO demo people or money.
 *
 * IDEMPOTENT: uses updateOrCreate keyed on the feature `key`, so it is safe to
 * run repeatedly (and safe in production) without creating duplicates or
 * clobbering admin-managed availability flags destructively.
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        foreach (SeedCatalog::FEATURES as $feature) {
            Feature::updateOrCreate(
                ['key' => $feature['key']],
                [
                    'name' => $feature['name'],
                    'description' => $feature['description'],
                    'requires_features' => null,
                    'requires_identity_verification' => $feature['requires_verification'],
                    'enabled_by_default' => $feature['default'],
                    'is_available' => true,
                ],
            );
        }

        $this->command?->info('  ✓ Reference data: '.count(SeedCatalog::FEATURES).' platform features.');
    }
}
