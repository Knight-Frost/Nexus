<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\EmailLog;
use App\Models\User;
use App\Notifications\EmailVerificationNotification;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

/**
 * EmailVerificationController
 *
 * Token-based, SPA-friendly email verification.
 * IMPORTANT: email verification is informational; it does NOT gate any feature.
 *            The identity-verification lifecycle is the real trust gate.
 *
 * Flow:
 *   1. POST /email/verification-notification → sends a signed backend URL embedded in
 *      the SPA link, with id/hash/expires/signature as query params.
 *   2. SPA reads params from query string → POST /email/verify {id, hash, signature, expires}
 *   3. Controller reconstructs the signed URL and validates it server-side.
 */
class EmailVerificationController extends Controller
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    // -------------------------------------------------------------------------
    // POST /email/verification-notification  (auth:sanctum required)
    // -------------------------------------------------------------------------

    /**
     * Send (or resend) a verification email to the currently authenticated user.
     */
    public function sendVerification(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json(['message' => 'Email verification is only available for user accounts.'], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email is already verified.']);
        }

        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');

        // Build a temporary signed URL for our backend verify route (60 min).
        // Laravel sorts query params alphabetically when building signed URLs.
        $backendSignedUrl = URL::temporarySignedRoute(
            'email.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // Parse the query params out so the SPA can forward them to POST /email/verify.
        $parsed = parse_url($backendSignedUrl);
        parse_str($parsed['query'] ?? '', $params);

        $spaUrl = $frontendUrl.'/verify-email?'
            .'id='.urlencode((string) ($params['id'] ?? ''))
            .'&hash='.urlencode((string) ($params['hash'] ?? ''))
            .'&signature='.urlencode((string) ($params['signature'] ?? ''))
            .'&expires='.urlencode((string) ($params['expires'] ?? ''));

        $user->notify(new EmailVerificationNotification($spaUrl));

        // Log intent; related_* points at user (email_logs.related_type is NOT NULL).
        EmailLog::create([
            'recipient_type' => User::class,
            'recipient_id' => $user->id,
            'recipient_email' => $user->email,
            'subject' => 'Verify your email address',
            'mailable_class' => EmailVerificationNotification::class,
            'email_type' => 'verification',
            'related_type' => User::class,
            'related_id' => $user->id,
            'status' => 'queued',
            'sent_at' => now(),
        ]);

        return response()->json(['message' => 'Verification link sent.']);
    }

    // -------------------------------------------------------------------------
    // POST /email/verify  (no auth required — the signature is the proof)
    // -------------------------------------------------------------------------

    /**
     * Mark the user's email as verified.
     *
     * Validates by reconstructing the signed backend route URL in the exact
     * same param order Laravel uses (alphabetical), then verifying the HMAC.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'id' => ['required', 'integer'],
            'hash' => ['required', 'string'],
            'signature' => ['required', 'string'],
            'expires' => ['required', 'integer'],
        ]);

        $user = User::find($request->integer('id'));

        if (! $user) {
            return response()->json(['message' => 'Invalid verification link.'], 403);
        }

        // Hash check (sha1 of email — matches what sendVerification built).
        if (! hash_equals(sha1($user->email), (string) $request->input('hash'))) {
            return response()->json(['message' => 'Invalid verification link.'], 403);
        }

        // Rebuild the original signed URL.
        // Laravel's URL::temporarySignedRoute sorts params alphabetically and appends
        // &signature= at the very end. We reconstruct in the same order so the
        // HMAC verification matches.
        $baseUrl = URL::route('email.verify', [], true);

        // Sorted params (without signature) — must match what Laravel signed.
        $paramsWithoutSig = [
            'expires' => $request->input('expires'),
            'hash' => $request->input('hash'),
            'id' => $request->input('id'),
        ];
        ksort($paramsWithoutSig);

        $queryWithoutSig = http_build_query($paramsWithoutSig);
        $urlWithoutSig = $baseUrl.'?'.$queryWithoutSig;
        $fullUrl = $urlWithoutSig.'&signature='.$request->input('signature');

        // Use a synthetic GET request to the reconstructed URL.
        $syntheticRequest = Request::create($fullUrl, 'GET');

        if (! URL::hasValidSignature($syntheticRequest)) {
            return response()->json(['message' => 'Invalid or expired verification link.'], 422);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email is already verified.']);
        }

        $user->markEmailAsVerified();

        $this->auditService->logEmailVerified($user);

        return response()->json(['message' => 'Email verified successfully.']);
    }
}
