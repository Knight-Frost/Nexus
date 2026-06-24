<?php

namespace Tests\Feature;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\Listing;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * LandlordApplicationReadinessTest
 *
 * Feature 1: every landlord-facing application response carries a `readiness`
 * summary derived from the applicant's real profile state.
 */
class LandlordApplicationReadinessTest extends TestCase
{
    use RefreshDatabase;

    protected User $landlord;

    protected User $tenant;

    protected Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landlord = User::factory()->landlord()->create();
        $this->tenant = User::factory()->tenant()->create([
            'identity_verified' => false,
            'phone' => null,
        ]);

        $property = Property::factory()->create(['landlord_id' => $this->landlord->id]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);
        $this->listing = Listing::factory()->active()->create([
            'unit_id' => $unit->id,
            'landlord_id' => $this->landlord->id,
        ]);
    }

    private function makeApplication(array $overrides = []): Application
    {
        return Application::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'listing_id' => $this->listing->id,
            'landlord_id' => $this->landlord->id,
            'status' => ApplicationStatus::SUBMITTED,
        ], $overrides));
    }

    public function test_index_includes_readiness_for_each_application(): void
    {
        $this->makeApplication();

        Sanctum::actingAs($this->landlord, [], 'sanctum');

        $response = $this->getJson('/api/landlord/applications');

        $response->assertStatus(200)
            ->assertJsonStructure([
                ['readiness' => ['percentage', 'completed', 'total', 'items' => [['key', 'label', 'complete']]]],
            ]);

        // Default unverified tenant: not 100%.
        $this->assertLessThan(100, $response->json('0.readiness.percentage'));
        $this->assertSame(5, $response->json('0.readiness.total'));
    }

    public function test_show_includes_readiness(): void
    {
        $application = $this->makeApplication();

        Sanctum::actingAs($this->landlord, [], 'sanctum');

        $this->getJson("/api/landlord/applications/{$application->id}")
            ->assertStatus(200)
            ->assertJsonStructure(['readiness' => ['percentage', 'completed', 'total', 'items']]);
    }

    public function test_decide_includes_readiness(): void
    {
        $application = $this->makeApplication();

        Sanctum::actingAs($this->landlord, [], 'sanctum');

        $this->postJson("/api/landlord/applications/{$application->id}/decide", [
            'decision' => 'approved',
        ])
            ->assertStatus(200)
            ->assertJsonStructure(['readiness' => ['percentage', 'completed', 'total', 'items']])
            ->assertJsonPath('status', ApplicationStatus::APPROVED->value);
    }

    public function test_landlord_notes_still_visible_in_index(): void
    {
        $this->makeApplication(['landlord_notes' => 'Internal: strong applicant.']);

        Sanctum::actingAs($this->landlord, [], 'sanctum');

        $this->getJson('/api/landlord/applications')
            ->assertStatus(200)
            ->assertJsonPath('0.landlord_notes', 'Internal: strong applicant.');
    }
}
