<?php

namespace Database\Factories;

use App\Enums\ReviewStatus;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Review>
 */
class ReviewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reviewer_user_id' => User::factory()->tenant(),
            'property_id' => null, // must be set explicitly
            'unit_id' => null,
            'landlord_id' => User::factory()->landlord(),
            'contract_id' => Contract::factory()->active(),
            'rating' => fake()->numberBetween(1, 5),
            'title' => fake()->optional()->sentence(5),
            'body' => fake()->paragraph(),
            'status' => ReviewStatus::PENDING,
            'moderation_reason' => null,
            'moderated_by_admin_id' => null,
            'landlord_response' => null,
            'responded_at' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReviewStatus::PENDING,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReviewStatus::APPROVED,
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReviewStatus::REJECTED,
        ]);
    }

    public function flagged(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReviewStatus::FLAGGED,
        ]);
    }
}
