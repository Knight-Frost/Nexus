<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Self-service password change (POST /api/user/password).
 *
 * Shared by User (tenant/landlord) and Admin principals. Verifies the security
 * contract: current-password proof, strong-password policy, no-op rejection,
 * critical audit logging, in-app notification for Users, and revocation of
 * other sessions while keeping the current one alive.
 */
class PasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CurrentPass1'),
        ]);
        $token = $user->createToken('current')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/user/password', [
                'current_password' => 'CurrentPass1',
                'password' => 'BrandNewPass2',
                'password_confirmation' => 'BrandNewPass2',
            ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('BrandNewPass2', $user->fresh()->password));

        // Critical audit record exists.
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'password_changed',
            'severity' => 'critical',
            'actor_id' => $user->id,
        ]);

        // In-app security notification created for the user.
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => 'password_changed',
        ]);
    }

    public function test_wrong_current_password_is_rejected_and_password_unchanged(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CurrentPass1'),
        ]);
        $token = $user->createToken('current')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/user/password', [
                'current_password' => 'WrongPass9',
                'password' => 'BrandNewPass2',
                'password_confirmation' => 'BrandNewPass2',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('current_password');

        // Password must be unchanged.
        $this->assertTrue(Hash::check('CurrentPass1', $user->fresh()->password));

        // The failed attempt is audited.
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'password_change_failed',
            'actor_id' => $user->id,
        ]);
    }

    public function test_weak_new_password_is_rejected(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CurrentPass1'),
        ]);
        $token = $user->createToken('current')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/user/password', [
                'current_password' => 'CurrentPass1',
                'password' => 'weak',
                'password_confirmation' => 'weak',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('password');
    }

    public function test_reusing_current_password_is_rejected(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CurrentPass1'),
        ]);
        $token = $user->createToken('current')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/user/password', [
                'current_password' => 'CurrentPass1',
                'password' => 'CurrentPass1',
                'password_confirmation' => 'CurrentPass1',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('password');
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->postJson('/api/user/password', [
            'current_password' => 'CurrentPass1',
            'password' => 'BrandNewPass2',
            'password_confirmation' => 'BrandNewPass2',
        ]);

        $response->assertStatus(401);
    }

    public function test_changing_password_revokes_other_sessions_but_keeps_current(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CurrentPass1'),
        ]);
        $otherToken = $user->createToken('other-device');
        $currentToken = $user->createToken('current');

        $this->assertSame(2, $user->tokens()->count());

        $response = $this->withHeader('Authorization', "Bearer {$currentToken->plainTextToken}")
            ->postJson('/api/user/password', [
                'current_password' => 'CurrentPass1',
                'password' => 'BrandNewPass2',
                'password_confirmation' => 'BrandNewPass2',
            ]);
        $response->assertOk();
        $response->assertJson(['revoked_other_sessions' => 1]);

        // Assert at the data layer (the security invariant), not via a second
        // HTTP request — the Sanctum guard memoizes the first-request user
        // within a single test, which would mask a revoked token.
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $otherToken->accessToken->getKey(),
        ]);
        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $currentToken->accessToken->getKey(),
        ]);
    }

    public function test_admin_can_change_password_and_is_audited_without_notification(): void
    {
        $admin = Admin::factory()->create([
            'password' => Hash::make('AdminPass1'),
        ]);
        $token = $admin->createToken('admin-current')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/user/password', [
                'current_password' => 'AdminPass1',
                'password' => 'AdminBrandNew2',
                'password_confirmation' => 'AdminBrandNew2',
            ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('AdminBrandNew2', $admin->fresh()->password));

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'password_changed',
            'severity' => 'critical',
        ]);

        // Admins have no in-app notification channel — none must be fabricated.
        $this->assertDatabaseCount('notifications', 0);
    }
}
