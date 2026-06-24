<?php

namespace Tests\Feature;

use App\Enums\ContractStatus;
use App\Enums\MaintenanceCategory;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Models\Contract;
use App\Models\Listing;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * MaintenanceWorkflowTest
 *
 * Tests the full maintenance request domain:
 *   - Tenant submits, views, and cancels requests
 *   - Landlord lists and updates request status
 *   - Authorization boundaries enforced throughout
 *
 * Assumed route registrations (supervisor wires these into routes/api.php):
 *
 *   // Tenant
 *   Route::middleware(['auth:sanctum', 'tenant', 'rate.limit.role'])->prefix('tenant')->group(function () {
 *       Route::get('/maintenance', [MaintenanceRequestController::class, 'index']);
 *       Route::post('/maintenance', [MaintenanceRequestController::class, 'store']);
 *       Route::get('/maintenance/{maintenanceRequest}', [MaintenanceRequestController::class, 'show']);
 *       Route::post('/maintenance/{maintenanceRequest}/cancel', [MaintenanceRequestController::class, 'cancel']);
 *   });
 *
 *   // Landlord
 *   Route::middleware(['auth:sanctum', 'landlord', 'rate.limit.role'])->prefix('landlord')->group(function () {
 *       Route::get('/maintenance', [LandlordMaintenanceController::class, 'index']);
 *       Route::patch('/maintenance/{maintenanceRequest}/status', [LandlordMaintenanceController::class, 'updateStatus']);
 *   });
 */
class MaintenanceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Build a complete graph (landlord → property → unit → listing → contract)
     * and return all pieces.
     */
    private function buildActiveGraph(): array
    {
        $landlord = User::factory()->landlord()->create();
        $property = Property::factory()->create(['landlord_id' => $landlord->id]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);
        $listing = Listing::factory()->active()->create([
            'unit_id' => $unit->id,
            'landlord_id' => $landlord->id,
        ]);
        $tenant = User::factory()->tenant()->create();
        $contract = Contract::factory()->active()->create([
            'listing_id' => $listing->id,
            'landlord_id' => $landlord->id,
            'tenant_id' => $tenant->id,
        ]);

        return compact('landlord', 'property', 'unit', 'listing', 'tenant', 'contract');
    }

    private function maintenancePayload(string $contractId, array $overrides = []): array
    {
        return array_merge([
            'contract_id' => $contractId,
            'title' => 'Leaking kitchen tap',
            'description' => 'The kitchen tap has been dripping continuously for two days.',
            'category' => MaintenanceCategory::PLUMBING->value,
            'priority' => MaintenancePriority::MEDIUM->value,
        ], $overrides);
    }

    // ─── Tenant: Create ───────────────────────────────────────────────────────

    /** @test */
    public function test_tenant_with_active_contract_can_file_maintenance_request(): void
    {
        $graph = $this->buildActiveGraph();
        Sanctum::actingAs($graph['tenant'], ['*']);

        $response = $this->postJson('/api/tenant/maintenance', $this->maintenancePayload($graph['contract']->id));

        $response->assertStatus(201);

        // Critical: property_id, unit_id, landlord_id must be derived from the
        // contract — not supplied by the client.
        $response->assertJson([
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
            'tenant_id' => $graph['tenant']->id,
            'status' => MaintenanceStatus::OPEN->value,
        ]);

        $this->assertDatabaseHas('maintenance_requests', [
            'contract_id' => $graph['contract']->id,
            'tenant_id' => $graph['tenant']->id,
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
        ]);
    }

    /** @test */
    public function test_tenant_cannot_file_against_non_active_contract(): void
    {
        $graph = $this->buildActiveGraph();

        // Re-set the contract to a non-active status
        $graph['contract']->update(['status' => ContractStatus::PENDING_TENANT]);

        Sanctum::actingAs($graph['tenant'], ['*']);

        $response = $this->postJson('/api/tenant/maintenance', $this->maintenancePayload($graph['contract']->id));

        $response->assertStatus(422)
            ->assertJson(['message' => 'You can only open maintenance requests against an active lease.']);
    }

    /** @test */
    public function test_tenant_cannot_file_against_another_tenants_contract(): void
    {
        $graph = $this->buildActiveGraph();
        $otherTenant = User::factory()->tenant()->create();

        // otherTenant tries to use graph['contract'] which belongs to graph['tenant']
        Sanctum::actingAs($otherTenant, ['*']);

        $response = $this->postJson('/api/tenant/maintenance', $this->maintenancePayload($graph['contract']->id));

        $response->assertStatus(403);
    }

    // ─── Tenant: Index ────────────────────────────────────────────────────────

    /** @test */
    public function test_tenant_index_returns_only_own_requests(): void
    {
        $graph = $this->buildActiveGraph();
        $graph2 = $this->buildActiveGraph();

        // Create one request for each tenant
        $req1 = MaintenanceRequest::factory()->create([
            'tenant_id' => $graph['tenant']->id,
            'contract_id' => $graph['contract']->id,
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
        ]);

        MaintenanceRequest::factory()->create([
            'tenant_id' => $graph2['tenant']->id,
            'contract_id' => $graph2['contract']->id,
            'property_id' => $graph2['property']->id,
            'unit_id' => $graph2['unit']->id,
            'landlord_id' => $graph2['landlord']->id,
        ]);

        Sanctum::actingAs($graph['tenant'], ['*']);

        $response = $this->getJson('/api/tenant/maintenance');

        $response->assertStatus(200);

        $ids = collect($response->json())->pluck('id');
        $this->assertCount(1, $ids);
        $this->assertTrue($ids->contains($req1->id));
    }

    // ─── Tenant: Show ─────────────────────────────────────────────────────────

    /** @test */
    public function test_tenant_cannot_view_another_tenants_request(): void
    {
        $graph = $this->buildActiveGraph();
        $graph2 = $this->buildActiveGraph();

        $req = MaintenanceRequest::factory()->create([
            'tenant_id' => $graph2['tenant']->id,
            'contract_id' => $graph2['contract']->id,
            'property_id' => $graph2['property']->id,
            'unit_id' => $graph2['unit']->id,
            'landlord_id' => $graph2['landlord']->id,
        ]);

        Sanctum::actingAs($graph['tenant'], ['*']);

        $this->getJson("/api/tenant/maintenance/{$req->id}")->assertStatus(403);
    }

    // ─── Tenant: Cancel ───────────────────────────────────────────────────────

    /** @test */
    public function test_tenant_can_cancel_open_request(): void
    {
        $graph = $this->buildActiveGraph();

        $req = MaintenanceRequest::factory()->create([
            'tenant_id' => $graph['tenant']->id,
            'contract_id' => $graph['contract']->id,
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
            'status' => MaintenanceStatus::OPEN->value,
        ]);

        Sanctum::actingAs($graph['tenant'], ['*']);

        $response = $this->postJson("/api/tenant/maintenance/{$req->id}/cancel");

        $response->assertStatus(200)
            ->assertJson(['status' => MaintenanceStatus::CANCELLED->value]);

        $this->assertDatabaseHas('maintenance_requests', [
            'id' => $req->id,
            'status' => MaintenanceStatus::CANCELLED->value,
        ]);
    }

    /** @test */
    public function test_tenant_cannot_cancel_non_open_request(): void
    {
        $graph = $this->buildActiveGraph();

        // Create a request that is already acknowledged (not cancellable)
        $req = MaintenanceRequest::factory()->inProgress()->create([
            'tenant_id' => $graph['tenant']->id,
            'contract_id' => $graph['contract']->id,
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
        ]);

        Sanctum::actingAs($graph['tenant'], ['*']);

        $this->postJson("/api/tenant/maintenance/{$req->id}/cancel")->assertStatus(403);
    }

    // ─── Landlord: Index ──────────────────────────────────────────────────────

    /** @test */
    public function test_landlord_index_returns_only_own_requests(): void
    {
        $graph = $this->buildActiveGraph();
        $graph2 = $this->buildActiveGraph();

        $ownReq = MaintenanceRequest::factory()->create([
            'tenant_id' => $graph['tenant']->id,
            'contract_id' => $graph['contract']->id,
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
        ]);

        // Request belonging to another landlord
        MaintenanceRequest::factory()->create([
            'tenant_id' => $graph2['tenant']->id,
            'contract_id' => $graph2['contract']->id,
            'property_id' => $graph2['property']->id,
            'unit_id' => $graph2['unit']->id,
            'landlord_id' => $graph2['landlord']->id,
        ]);

        Sanctum::actingAs($graph['landlord'], ['*']);

        $response = $this->getJson('/api/landlord/maintenance');

        $response->assertStatus(200);

        $ids = collect($response->json())->pluck('id');
        $this->assertCount(1, $ids);
        $this->assertTrue($ids->contains($ownReq->id));
    }

    // ─── Landlord: updateStatus ───────────────────────────────────────────────

    /** @test */
    public function test_landlord_can_update_status_of_own_request(): void
    {
        $graph = $this->buildActiveGraph();

        $req = MaintenanceRequest::factory()->create([
            'tenant_id' => $graph['tenant']->id,
            'contract_id' => $graph['contract']->id,
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
            'status' => MaintenanceStatus::OPEN->value,
        ]);

        Sanctum::actingAs($graph['landlord'], ['*']);

        $response = $this->patchJson("/api/landlord/maintenance/{$req->id}/status", [
            'status' => MaintenanceStatus::IN_PROGRESS->value,
        ]);

        $response->assertStatus(200)
            ->assertJson(['status' => MaintenanceStatus::IN_PROGRESS->value]);
    }

    /** @test */
    public function test_landlord_cannot_update_another_landlords_request(): void
    {
        $graph = $this->buildActiveGraph();
        $graph2 = $this->buildActiveGraph();

        $req = MaintenanceRequest::factory()->create([
            'tenant_id' => $graph['tenant']->id,
            'contract_id' => $graph['contract']->id,
            'property_id' => $graph['property']->id,
            'unit_id' => $graph['unit']->id,
            'landlord_id' => $graph['landlord']->id,
        ]);

        // A different landlord tries to update the request
        Sanctum::actingAs($graph2['landlord'], ['*']);

        $this->patchJson("/api/landlord/maintenance/{$req->id}/status", [
            'status' => MaintenanceStatus::ACKNOWLEDGED->value,
        ])->assertStatus(403);
    }

    // ─── Unauthenticated ─────────────────────────────────────────────────────

    /** @test */
    public function test_unauthenticated_cannot_access_tenant_maintenance(): void
    {
        $this->getJson('/api/tenant/maintenance')->assertStatus(401);
        $this->postJson('/api/tenant/maintenance', [])->assertStatus(401);
    }

    /** @test */
    public function test_unauthenticated_cannot_access_landlord_maintenance(): void
    {
        $this->getJson('/api/landlord/maintenance')->assertStatus(401);
    }
}
