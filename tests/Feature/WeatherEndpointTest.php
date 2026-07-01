<?php

namespace Tests\Feature;

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * WeatherEndpointTest
 *
 * Proves that GET /weather is registered, requires authentication, and
 * returns a graceful {available:false} payload when no API key is set.
 * The real external API is never called in tests — the no-key path is
 * what's exercised.
 */
class WeatherEndpointTest extends TestCase
{
    use RefreshDatabase;

    /** Unauthenticated requests are rejected. */
    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/weather')->assertUnauthorized();
    }

    /**
     * When OPENWEATHER_API_KEY is not set (default in test env) the service
     * returns {available:false} and the endpoint returns HTTP 200.
     */
    public function test_returns_graceful_unavailable_when_no_api_key_configured(): void
    {
        // Ensure no key is set for this test (matches the test .env default).
        config(['services.openweather.key' => null]);

        $user = User::factory()->create(['user_type' => UserType::TENANT]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/weather')
            ->assertOk()
            ->assertJsonFragment(['available' => false]);
    }

    /** Both tenants and landlords can call the endpoint. */
    public function test_landlord_can_also_reach_the_weather_endpoint(): void
    {
        config(['services.openweather.key' => null]);

        $landlord = User::factory()->create(['user_type' => UserType::LANDLORD]);

        $this->actingAs($landlord, 'sanctum')
            ->getJson('/api/weather')
            ->assertOk()
            ->assertJsonFragment(['available' => false]);
    }
}
