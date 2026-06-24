<?php

namespace Tests\Feature;

use App\Enums\DocumentType;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Proves the tenant profile + readiness are real: editable fields persist,
 * privileged fields cannot be set by the client, and readiness is computed
 * from actual columns/documents (never a hardcoded 75%).
 */
class TenantProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_view_profile_and_readiness(): void
    {
        Sanctum::actingAs(User::factory()->tenant()->create(), [], 'sanctum');

        $this->getJson('/api/tenant/profile')
            ->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'full_name', 'initials', 'city', 'next_of_kin_name'],
                'readiness' => ['percentage', 'completed', 'total', 'items'],
            ]);
    }

    public function test_landlord_cannot_access_tenant_profile(): void
    {
        Sanctum::actingAs(User::factory()->landlord()->create(), [], 'sanctum');

        $this->getJson('/api/tenant/profile')->assertStatus(403);
    }

    public function test_readiness_is_computed_from_real_fields(): void
    {
        // A bare tenant: only identity unverified, nothing filled -> low score.
        $tenant = User::factory()->tenant()->create([
            'phone' => null,
            'city' => null,
            'date_of_birth' => null,
            'identity_verified' => false,
            'next_of_kin_name' => null,
            'next_of_kin_phone' => null,
        ]);
        Sanctum::actingAs($tenant, [], 'sanctum');

        $this->getJson('/api/tenant/profile')->assertJsonPath('readiness.percentage', 0);

        // Fill everything that has real backing -> 100%.
        $tenant->update([
            'phone' => '0241234567',
            'city' => 'Accra',
            'date_of_birth' => '1995-01-01',
            'identity_verified' => true,
            'next_of_kin_name' => 'Ama Mensah',
            'next_of_kin_phone' => '0209876543',
        ]);
        Document::factory()->create([
            'owner_user_id' => $tenant->id,
            'uploaded_by_id' => $tenant->id,
            'document_type' => DocumentType::PROOF_OF_INCOME->value,
        ]);

        $this->getJson('/api/tenant/profile')->assertJsonPath('readiness.percentage', 100);
    }

    public function test_tenant_can_update_allowed_fields(): void
    {
        $tenant = User::factory()->tenant()->create(['city' => null]);
        Sanctum::actingAs($tenant, [], 'sanctum');

        $this->patchJson('/api/tenant/profile', [
            'city' => 'Kumasi',
            'next_of_kin_name' => 'Kw?me Boateng',
            'next_of_kin_phone' => '0551112222',
            'next_of_kin_relationship' => 'Brother',
        ])->assertOk()->assertJsonPath('user.city', 'Kumasi');

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'city' => 'Kumasi',
            'next_of_kin_name' => 'Kw?me Boateng',
        ]);
    }

    public function test_tenant_cannot_update_protected_fields(): void
    {
        $tenant = User::factory()->tenant()->create(['identity_verified' => false]);
        Sanctum::actingAs($tenant, [], 'sanctum');

        $this->patchJson('/api/tenant/profile', [
            'city' => 'Tema',
            'user_type' => 'landlord',
            'identity_verified' => true,
            'is_active' => false,
            'email' => 'hacker@evil.test',
        ])->assertOk();

        $tenant->refresh();
        $this->assertSame('tenant', $tenant->user_type->value);
        $this->assertFalse($tenant->identity_verified);
        $this->assertTrue($tenant->is_active);
        $this->assertNotSame('hacker@evil.test', $tenant->email);
        // The one allowed field still applied.
        $this->assertSame('Tema', $tenant->city);
    }

    public function test_profile_validation_errors_return_json(): void
    {
        Sanctum::actingAs(User::factory()->tenant()->create(), [], 'sanctum');

        $this->patchJson('/api/tenant/profile', [
            'date_of_birth' => now()->addYear()->toDateString(), // future -> invalid
        ])->assertStatus(422)->assertJsonValidationErrors(['date_of_birth']);
    }
}
