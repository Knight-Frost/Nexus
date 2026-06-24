<?php

namespace Database\Factories;

use App\Enums\ApplicationStatus;
use App\Enums\UserType;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Application>
 */
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        $listing = Listing::factory()->active()->create();

        return [
            'listing_id' => $listing->id,
            'landlord_id' => $listing->landlord_id,
            'tenant_id' => User::factory()->state(['user_type' => UserType::TENANT->value]),
            'status' => ApplicationStatus::SUBMITTED,
            'cover_note' => fake()->paragraph(),
            'submitted_at' => now(),
        ];
    }

    /**
     * Application approved by landlord.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApplicationStatus::APPROVED,
            'reviewed_at' => now(),
            'decided_at' => now(),
            'decision_reason' => fake()->sentence(),
        ]);
    }

    /**
     * Application rejected by landlord.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApplicationStatus::REJECTED,
            'reviewed_at' => now(),
            'decided_at' => now(),
            'decision_reason' => fake()->sentence(),
        ]);
    }

    /**
     * Application withdrawn by tenant.
     */
    public function withdrawn(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApplicationStatus::WITHDRAWN,
            'withdrawn_at' => now(),
        ]);
    }

    /**
     * Application currently under landlord review.
     */
    public function inReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ApplicationStatus::IN_REVIEW,
            'reviewed_at' => now(),
        ]);
    }
}
