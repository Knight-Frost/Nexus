<?php

namespace Database\Factories;

use App\Models\Listing;
use App\Models\ListingPhoto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ListingPhoto>
 */
class ListingPhotoFactory extends Factory
{
    protected $model = ListingPhoto::class;

    public function definition(): array
    {
        return [
            'listing_id' => Listing::factory(),
            'path' => 'listings/photos/test.jpg',
            'disk' => 'local',
            'filename' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 12345,
            'is_primary' => true,
            'sort_order' => 0,
        ];
    }

    /**
     * Mark as non-primary.
     */
    public function nonPrimary(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_primary' => false,
        ]);
    }
}
