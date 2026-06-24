<?php

namespace Database\Factories;

use App\Enums\UserType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password = null;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'user_type' => UserType::TENANT,
            'is_active' => true,
            'suspended_at' => null,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Indicate that the user is a landlord.
     */
    public function landlord(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_type' => UserType::LANDLORD,
        ]);
    }

    /**
     * Indicate that the user is a tenant.
     */
    public function tenant(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_type' => UserType::TENANT,
        ]);
    }

    /**
     * Indicate that the user has a verified identity.
     * Sets both the legacy identity_verified flag and the Phase 4 verification_status.
     */
    public function identityVerified(): static
    {
        return $this->state(fn (array $attributes) => [
            'identity_verified' => true,
            'identity_verified_at' => now(),
            'verification_status' => 'verified',
        ]);
    }

    /**
     * Indicate that the user's account is active (explicit default).
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => true,
            'suspended_at' => null,
            'account_status' => 'active',
        ]);
    }

    /**
     * Indicate that the user's account is suspended.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
            'suspended_at' => now(),
            'suspension_reason' => 'Suspended for testing.',
            'account_status' => 'suspended',
        ]);
    }
}
