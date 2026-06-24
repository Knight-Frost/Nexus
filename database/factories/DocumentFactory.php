<?php

namespace Database\Factories;

use App\Enums\DocumentType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Document>
 */
class DocumentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $owner = User::factory()->tenant()->create();

        return [
            'owner_user_id' => $owner->id,
            'uploaded_by_id' => $owner->id,
            'document_type' => fake()->randomElement(DocumentType::cases())->value,
            'original_filename' => 'payslip.pdf',
            'stored_path' => 'documents/1/'.Str::uuid().'.pdf',
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'size_bytes' => fake()->numberBetween(50000, 5000000),
            'verified_at' => null,
            'related_type' => null,
            'related_id' => null,
        ];
    }

    /**
     * State: document has been verified.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'verified_at' => now(),
        ]);
    }
}
