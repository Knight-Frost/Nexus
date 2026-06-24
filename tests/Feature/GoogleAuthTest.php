<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

/**
 * GoogleAuthTest
 *
 * Covers the stateless Google OAuth flow via /auth/google/redirect and /auth/google/callback.
 * Uses Socialite facade mocking so no real HTTP calls are made.
 */
class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a mocked Socialite driver that returns the given fake social user
     * when stateless()->user() is called.
     */
    private function mockSocialiteUser(string $email, string $googleId = 'google-123', string $name = 'Test User'): void
    {
        $abstractUser = Mockery::mock(SocialiteUser::class);
        $abstractUser->shouldReceive('getId')->andReturn($googleId);
        $abstractUser->shouldReceive('getEmail')->andReturn($email);
        $abstractUser->shouldReceive('getName')->andReturn($name);
        $abstractUser->shouldReceive('getNickname')->andReturn(null);

        $provider = Mockery::mock(\Laravel\Socialite\Contracts\Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($abstractUser);
        // For the redirect test
        $redirect = Mockery::mock(\Symfony\Component\HttpFoundation\RedirectResponse::class);
        $redirect->shouldReceive('getTargetUrl')->andReturn('https://accounts.google.com/o/oauth2/auth?client_id=fake');
        $provider->shouldReceive('redirect')->andReturn($redirect);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    /** Set Google credentials in config so the controller reports configured. */
    private function configureGoogle(): void
    {
        config([
            'services.google.client_id' => 'fake-client-id',
            'services.google.client_secret' => 'fake-client-secret',
            'services.google.redirect' => 'http://localhost/api/auth/google/callback',
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/providers
    // -------------------------------------------------------------------------

    public function test_providers_returns_false_when_google_not_configured(): void
    {
        config(['services.google.client_id' => '', 'services.google.client_secret' => '']);

        $response = $this->getJson('/api/auth/providers');
        $response->assertOk();
        $response->assertJson(['google' => false]);
    }

    public function test_providers_returns_true_when_google_configured(): void
    {
        $this->configureGoogle();

        $response = $this->getJson('/api/auth/providers');
        $response->assertOk();
        $response->assertJson(['google' => true]);
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/google/redirect
    // -------------------------------------------------------------------------

    public function test_redirect_returns_503_when_google_not_configured(): void
    {
        config(['services.google.client_id' => '', 'services.google.client_secret' => '']);

        $response = $this->getJson('/api/auth/google/redirect');
        $response->assertStatus(503);
        $response->assertJsonFragment(['message' => 'Google sign-in is not configured.']);
    }

    public function test_redirect_returns_url_when_configured(): void
    {
        $this->configureGoogle();
        $this->mockSocialiteUser('anyone@example.com');

        $response = $this->getJson('/api/auth/google/redirect');
        $response->assertOk();
        $response->assertJsonStructure(['url']);
        $this->assertStringContainsString('accounts.google.com', $response->json('url'));
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/google/callback — new user (created)
    // -------------------------------------------------------------------------

    public function test_callback_creates_new_user_and_returns_token(): void
    {
        $this->configureGoogle();
        $this->mockSocialiteUser('newuser@example.com', 'g-new-001', 'New User');

        $response = $this->getJson('/api/auth/google/callback');
        $response->assertStatus(201);
        $response->assertJsonStructure(['user', 'token']);
        $response->assertJsonPath('user.email', 'newuser@example.com');

        $user = User::where('email', 'newuser@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('g-new-001', $user->google_id);
        $this->assertNotNull($user->email_verified_at, 'New Google users should have email_verified_at set');
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/google/callback — existing user matched by google_id
    // -------------------------------------------------------------------------

    public function test_callback_logs_in_user_matched_by_google_id(): void
    {
        $this->configureGoogle();

        $user = User::factory()->create([
            'email' => 'existing@example.com',
            'google_id' => 'g-existing-001',
        ]);

        $this->mockSocialiteUser('existing@example.com', 'g-existing-001', 'Existing User');

        $response = $this->getJson('/api/auth/google/callback');
        $response->assertOk();
        $response->assertJsonStructure(['user', 'token']);
        $response->assertJsonPath('user.email', 'existing@example.com');

        // No new user created
        $this->assertEquals(1, User::where('email', 'existing@example.com')->count());
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/google/callback — existing email, no google_id → link
    // -------------------------------------------------------------------------

    public function test_callback_links_google_id_to_existing_email_user(): void
    {
        $this->configureGoogle();

        $user = User::factory()->create([
            'email' => 'linkme@example.com',
            'google_id' => null,
            'email_verified_at' => null,
        ]);

        $this->mockSocialiteUser('linkme@example.com', 'g-link-001', 'Link Me');

        $response = $this->getJson('/api/auth/google/callback');
        $response->assertOk();
        $response->assertJsonStructure(['user', 'token']);

        $user->refresh();
        $this->assertEquals('g-link-001', $user->google_id, 'google_id should be linked');
        $this->assertNotNull($user->email_verified_at, 'email_verified_at should be set on link');
        $this->assertEquals(1, User::where('email', 'linkme@example.com')->count(), 'No duplicate users should be created');
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/google/callback — Admin email → refused
    // -------------------------------------------------------------------------

    public function test_callback_refuses_admin_email(): void
    {
        $this->configureGoogle();

        Admin::factory()->create(['email' => 'admin@example.com']);

        $this->mockSocialiteUser('admin@example.com', 'g-admin-001', 'Admin User');

        $response = $this->getJson('/api/auth/google/callback');
        $response->assertStatus(403);
        $this->assertStringContainsString(
            'administrator',
            strtolower($response->json('message') ?? '')
        );
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/google/callback — 503 when not configured
    // -------------------------------------------------------------------------

    public function test_callback_returns_503_when_not_configured(): void
    {
        config(['services.google.client_id' => '', 'services.google.client_secret' => '']);

        $response = $this->getJson('/api/auth/google/callback');
        $response->assertStatus(503);
    }
}
