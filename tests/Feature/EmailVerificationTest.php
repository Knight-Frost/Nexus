<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * EmailVerificationTest
 *
 * Covers send + verify email verification flow.
 * IMPORTANT: Verification does not gate features — it's informational.
 */
class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // POST /api/email/verification-notification
    // -------------------------------------------------------------------------

    public function test_unauthenticated_cannot_request_verification(): void
    {
        $response = $this->postJson('/api/email/verification-notification');
        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_request_verification(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/email/verification-notification');

        $response->assertOk();
        $response->assertJsonFragment(['message' => 'Verification link sent.']);
    }

    public function test_already_verified_user_gets_friendly_message(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/email/verification-notification');

        $response->assertOk();
        $response->assertJsonFragment(['message' => 'Email is already verified.']);
    }

    // -------------------------------------------------------------------------
    // POST /api/email/verify
    // -------------------------------------------------------------------------

    public function test_valid_signed_link_verifies_email(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        // Build the signed URL the same way the controller does.
        $signedUrl = URL::temporarySignedRoute(
            'email.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $parsed = parse_url($signedUrl);
        parse_str($parsed['query'] ?? '', $params);

        $response = $this->postJson('/api/email/verify', [
            'id' => $params['id'],
            'hash' => $params['hash'],
            'signature' => $params['signature'],
            'expires' => $params['expires'],
        ]);

        $response->assertOk();
        $response->assertJsonFragment(['message' => 'Email verified successfully.']);

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_bad_hash_fails_verification(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $signedUrl = URL::temporarySignedRoute(
            'email.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $parsed = parse_url($signedUrl);
        parse_str($parsed['query'] ?? '', $params);

        // Tamper with the hash
        $response = $this->postJson('/api/email/verify', [
            'id' => $params['id'],
            'hash' => 'tampered-hash',
            'signature' => $params['signature'],
            'expires' => $params['expires'],
        ]);

        $response->assertStatus(403);

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }

    public function test_expired_link_fails_verification(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        // Build a signed URL that already expired.
        $signedUrl = URL::temporarySignedRoute(
            'email.verify',
            now()->subMinutes(5), // expired 5 minutes ago
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $parsed = parse_url($signedUrl);
        parse_str($parsed['query'] ?? '', $params);

        $response = $this->postJson('/api/email/verify', [
            'id' => $params['id'],
            'hash' => $params['hash'],
            'signature' => $params['signature'],
            'expires' => $params['expires'],
        ]);

        // Should fail (signature invalid because URL::hasValidSignature checks expiry)
        $this->assertContains($response->status(), [403, 422]);

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }

    public function test_verify_requires_all_fields(): void
    {
        $response = $this->postJson('/api/email/verify', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['id', 'hash', 'signature', 'expires']);
    }
}
