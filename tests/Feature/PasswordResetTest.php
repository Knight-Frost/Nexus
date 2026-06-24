<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * PasswordResetTest
 *
 * Covers forgot-password and reset-password flows.
 * SECURITY: forgot-password must not leak whether an account exists.
 */
class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // POST /api/forgot-password
    // -------------------------------------------------------------------------

    public function test_forgot_password_returns_generic_200_for_existing_email(): void
    {
        User::factory()->create(['email' => 'real@example.com']);

        $response = $this->postJson('/api/forgot-password', ['email' => 'real@example.com']);

        $response->assertOk();
        $response->assertJsonFragment([
            'message' => 'If that email exists, a reset link has been sent.',
        ]);
    }

    public function test_forgot_password_returns_generic_200_for_non_existent_email(): void
    {
        $response = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com']);

        $response->assertOk();
        $response->assertJsonFragment([
            'message' => 'If that email exists, a reset link has been sent.',
        ]);
    }

    public function test_forgot_password_requires_email_field(): void
    {
        $response = $this->postJson('/api/forgot-password', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors('email');
    }

    // -------------------------------------------------------------------------
    // POST /api/reset-password
    // -------------------------------------------------------------------------

    public function test_reset_password_with_valid_token_updates_password(): void
    {
        $user = User::factory()->create([
            'email' => 'resetme@example.com',
            'password' => Hash::make('OldPass1234'),
        ]);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'resetme@example.com',
            'token' => $token,
            'password' => 'NewPass5678',
            'password_confirmation' => 'NewPass5678',
        ]);

        $response->assertOk();
        $response->assertJsonFragment(['message' => 'Password has been reset successfully.']);

        // Verify the user can now log in with the new password.
        $user->refresh();
        $this->assertTrue(Hash::check('NewPass5678', $user->password));
    }

    public function test_reset_password_user_can_login_after_reset(): void
    {
        $user = User::factory()->create([
            'email' => 'loginagain@example.com',
            'password' => Hash::make('OldPass1234'),
        ]);

        $token = Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'email' => 'loginagain@example.com',
            'token' => $token,
            'password' => 'NewPass5678',
            'password_confirmation' => 'NewPass5678',
        ]);

        $loginResponse = $this->postJson('/api/login', [
            'email' => 'loginagain@example.com',
            'password' => 'NewPass5678',
        ]);

        $loginResponse->assertOk();
        $loginResponse->assertJsonStructure(['user', 'token']);
    }

    public function test_reset_password_with_invalid_token_returns_error(): void
    {
        User::factory()->create(['email' => 'badtoken@example.com']);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'badtoken@example.com',
            'token' => 'not-a-real-token',
            'password' => 'NewPass5678',
            'password_confirmation' => 'NewPass5678',
        ]);

        $response->assertStatus(422);
    }

    public function test_reset_password_requires_all_fields(): void
    {
        $response = $this->postJson('/api/reset-password', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['token', 'email', 'password']);
    }

    public function test_reset_password_enforces_password_strength(): void
    {
        $user = User::factory()->create(['email' => 'strength@example.com']);
        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'strength@example.com',
            'token' => $token,
            'password' => 'weak',
            'password_confirmation' => 'weak',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('password');
    }
}
