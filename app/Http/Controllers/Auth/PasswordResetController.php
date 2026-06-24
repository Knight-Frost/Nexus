<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * PasswordResetController
 *
 * Implements the two-step password-reset flow via Laravel's built-in broker.
 * SECURITY: forgot-password always returns generic 200 to prevent email enumeration.
 */
class PasswordResetController extends Controller
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    // -------------------------------------------------------------------------
    // POST /forgot-password
    // -------------------------------------------------------------------------

    /**
     * Send a reset link to the given email.
     *
     * Always returns 200 regardless of whether the account exists so that
     * we do not leak information about registered email addresses.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        // Laravel's broker sends the reset link or silently fails if unknown.
        Password::sendResetLink(['email' => $request->input('email')]);

        return response()->json([
            'message' => 'If that email exists, a reset link has been sent.',
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /reset-password
    // -------------------------------------------------------------------------

    /**
     * Reset the password using the given token.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()],
            'password_confirmation' => ['required', 'string'],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password): void {
                // The 'hashed' cast on the model takes care of bcrypt.
                $user->password = $password;
                $user->save();

                $this->auditService->log(
                    actor: $user,
                    action: 'password_reset',
                    subject: $user,
                    description: "Password reset completed for: {$user->email}",
                    severity: 'warning'
                );
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password has been reset successfully.']);
        }

        // Map broker status constants to validation errors.
        $field = $status === Password::INVALID_TOKEN ? 'token' : 'email';

        throw ValidationException::withMessages([
            $field => [trans($status)],
        ]);
    }
}
