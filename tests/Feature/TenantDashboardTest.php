<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Application;
use App\Models\Listing;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Proves the tenant dashboard is backed by real, owner-scoped records — every
 * count comes from a query, never a hardcoded constant.
 */
class TenantDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_dashboard_request_is_rejected(): void
    {
        $this->getJson('/api/tenant/dashboard')->assertStatus(401);
    }

    public function test_tenant_can_fetch_dashboard(): void
    {
        Sanctum::actingAs(User::factory()->tenant()->create(), [], 'sanctum');

        $this->getJson('/api/tenant/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'name', 'initials', 'user_type'],
                'readiness' => ['percentage', 'items'],
                'stats' => [
                    'applications_count',
                    'saved_listings_count',
                    'verified_listings_count',
                    'unread_notifications_count',
                ],
                'feature_availability' => ['applications', 'maintenance', 'documents', 'messages'],
            ]);
    }

    public function test_landlord_cannot_fetch_tenant_dashboard(): void
    {
        Sanctum::actingAs(User::factory()->landlord()->create(), [], 'sanctum');

        $this->getJson('/api/tenant/dashboard')->assertStatus(403);
    }

    public function test_admin_cannot_fetch_tenant_dashboard(): void
    {
        Sanctum::actingAs(Admin::factory()->create(), [], 'sanctum');

        $this->getJson('/api/tenant/dashboard')->assertStatus(403);
    }

    public function test_dashboard_counts_reflect_real_records_only(): void
    {
        $tenant = User::factory()->tenant()->create();

        // A verified landlord with a public listing -> counts as a verified home.
        $verifiedLandlord = User::factory()->landlord()->create(['identity_verified' => true]);
        $verifiedListing = $this->publicListingFor($verifiedLandlord);

        // An unverified landlord with a public listing -> NOT a verified home.
        $unverifiedLandlord = User::factory()->landlord()->create(['identity_verified' => false]);
        $this->publicListingFor($unverifiedLandlord);

        // Two active applications + one withdrawn (withdrawn must NOT count).
        Application::factory()->count(2)->create([
            'tenant_id' => $tenant->id,
            'listing_id' => $verifiedListing->id,
            'landlord_id' => $verifiedLandlord->id,
        ]);
        Application::factory()->withdrawn()->create([
            'tenant_id' => $tenant->id,
            'listing_id' => $verifiedListing->id,
            'landlord_id' => $verifiedLandlord->id,
        ]);

        // Another tenant's application must not leak into this tenant's counts.
        $otherTenant = User::factory()->tenant()->create();
        Application::factory()->create([
            'tenant_id' => $otherTenant->id,
            'listing_id' => $verifiedListing->id,
            'landlord_id' => $verifiedLandlord->id,
        ]);

        $tenant->savedListings()->attach($verifiedListing->id);

        Sanctum::actingAs($tenant, [], 'sanctum');

        $this->getJson('/api/tenant/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.applications_count', 2)
            ->assertJsonPath('stats.saved_listings_count', 1)
            ->assertJsonPath('stats.verified_listings_count', 1);
    }

    private function publicListingFor(User $landlord): Listing
    {
        $property = Property::factory()->create(['landlord_id' => $landlord->id]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);

        return Listing::factory()->active()->create([
            'unit_id' => $unit->id,
            'landlord_id' => $landlord->id,
        ]);
    }
}
