<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Services\AuditService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

/**
 * AdminInviteController
 *
 * Public endpoint an invited admin uses to set their password and activate
 * their account. The invite token (from the `admins` password broker) is the
 * only guard — no session/auth is required to reach it, exactly like the
 * user-facing password reset. On success the invite is marked accepted.
 */
class AdminInviteController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
    ) {}

    public function accept(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()],
        ]);

        $status = Password::broker('admins')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (Admin $admin, string $password) {
                $admin->forceFill([
                    'password' => $password,
                    'invite_accepted_at' => now(),
                    'remember_token' => Str::random(60),
                ])->save();

                $this->auditService->log(
                    actor: $admin,
                    action: 'admin_invite_accepted',
                    subject: $admin,
                    description: "Admin {$admin->email} accepted their invitation and set a password",
                    severity: 'warning',
                );

                event(new PasswordReset($admin));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password set. You can now sign in.',
            ]);
        }

        // Do not leak whether the email exists; the token/email pair is invalid.
        return response()->json([
            'message' => 'This invitation link is invalid or has expired.',
        ], 422);
    }
}
