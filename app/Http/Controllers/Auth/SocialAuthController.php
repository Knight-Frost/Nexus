<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserType;
use App\Events\UserCreated;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Config;
use Laravel\Socialite\Facades\Socialite;

/**
 * SocialAuthController
 *
 * Handles Google OAuth (Socialite stateless flow).
 * SECURITY:
 *   - Never links/logs in an Admin account via social auth.
 *   - Only links by Google-verified email (no client-side email claim).
 *   - Feature is gracefully disabled when GOOGLE_CLIENT_ID is unset.
 */
class SocialAuthController extends Controller
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /** Returns true when Google OAuth credentials are configured. */
    private function googleConfigured(): bool
    {
        $id = Config::get('services.google.client_id');
        $secret = Config::get('services.google.client_secret');

        return filled($id) && filled($secret);
    }

    // -------------------------------------------------------------------------
    // GET /auth/providers
    // -------------------------------------------------------------------------

    /** Returns which social providers are currently configured. */
    public function providers(): JsonResponse
    {
        return response()->json([
            'google' => $this->googleConfigured(),
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /auth/google/redirect
    // -------------------------------------------------------------------------

    /** Returns the Google OAuth redirect URL so the SPA can navigate to it. */
    public function googleRedirect(): JsonResponse
    {
        if (! $this->googleConfigured()) {
            return response()->json([
                'message' => 'Google sign-in is not configured.',
            ], 503);
        }

        $url = Socialite::driver('google')
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    // -------------------------------------------------------------------------
    // GET /auth/google/callback
    // -------------------------------------------------------------------------

    /** Handles the OAuth callback from Google. */
    public function googleCallback(): JsonResponse
    {
        if (! $this->googleConfigured()) {
            return response()->json([
                'message' => 'Google sign-in is not configured.',
            ], 503);
        }

        $socialUser = Socialite::driver('google')->stateless()->user();

        $googleId = (string) $socialUser->getId();
        $email = (string) $socialUser->getEmail();
        $name = (string) ($socialUser->getName() ?? $socialUser->getNickname() ?? '');

        // SECURITY: Refuse if this email belongs to an Admin account.
        if (Admin::where('email', $email)->exists()) {
            return response()->json([
                'message' => 'This email address is associated with an administrator account. Please use the admin login.',
            ], 403);
        }

        // (a) Match by google_id → already linked, log in directly.
        $user = User::where('google_id', $googleId)->first();

        if ($user) {
            return $this->issueToken($user, 'google_login', isNew: false);
        }

        // (b) Match by Google-verified email → link google_id and log in.
        $user = User::where('email', $email)->first();

        if ($user) {
            $user->google_id = $googleId;
            // Google verifies email ownership, so we can trust it.
            if (is_null($user->email_verified_at)) {
                $user->email_verified_at = now();
            }
            $user->save();

            $this->auditService->log(
                actor: $user,
                action: 'google_account_linked',
                subject: $user,
                description: "Google account linked for: {$user->email}",
                severity: 'info'
            );

            return $this->issueToken($user, 'google_login', isNew: false);
        }

        // (c) No matching user → create a new one (tenant by default).
        $nameParts = $this->splitName($name);

        /** @var User $user */
        $user = User::create([
            'email' => $email,
            'google_id' => $googleId,
            'first_name' => $nameParts[0],
            'last_name' => $nameParts[1],
            'password' => \Illuminate\Support\Str::random(40), // randomised — not usable directly
            'user_type' => UserType::TENANT,
            'email_verified_at' => now(),
            'is_active' => true,
        ]);

        $this->auditService->logUserCreated($user);
        $this->auditService->log(
            actor: $user,
            action: 'google_login',
            subject: $user,
            description: "New user created via Google OAuth: {$user->email}",
            severity: 'info'
        );

        event(new UserCreated($user));

        return $this->issueToken($user, 'google_login', isNew: true, statusCode: 201);
    }

    // -------------------------------------------------------------------------
    // Shared helpers
    // -------------------------------------------------------------------------

    /** Issue a Sanctum token and return the formatted response. */
    private function issueToken(User $user, string $auditAction, bool $isNew, int $statusCode = 200): JsonResponse
    {
        $expiration = (int) config('sanctum.expiration', 1440);

        $token = $user->createToken('auth-token')->plainTextToken;

        if (! $isNew) {
            $this->auditService->log(
                actor: $user,
                action: $auditAction,
                subject: $user,
                description: "User logged in via Google: {$user->email}",
                severity: 'info'
            );
        }

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
        ], $statusCode);
    }

    /**
     * Format user for the API response (mirrors AuthController::formatUser).
     *
     * @return array<string, mixed>
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->full_name,
            'phone' => $user->phone,
            'user_type' => $user->user_type->value,
            'is_active' => $user->is_active,
            'identity_verified' => $user->identity_verified,
            'verification_status' => $user->verification_status instanceof \App\Enums\VerificationStatus
                ? $user->verification_status->value
                : ($user->verification_status ?? 'unverified'),
            'account_status' => $user->account_status instanceof \App\Enums\AccountStatus
                ? $user->account_status->value
                : ($user->account_status ?? 'active'),
            'created_at' => $user->created_at->toISOString(),
        ];
    }

    /**
     * Split a full name into [first, last]. Falls back gracefully.
     *
     * @return array{string, string}
     */
    private function splitName(string $name): array
    {
        $parts = array_filter(explode(' ', trim($name)));
        if (count($parts) >= 2) {
            $last = array_pop($parts);
            $first = implode(' ', $parts);

            return [$first, $last];
        }

        return [$name ?: 'User', ''];
    }
}
