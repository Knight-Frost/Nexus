<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureAdminCan Middleware
 *
 * Fine-grained authorization for admin routes. Used as `admin.can:<capability>`
 * (e.g. `admin.can:manage_users`). MUST run AFTER `auth:sanctum` and `admin`,
 * which already guarantee an authenticated, active Admin.
 *
 * Super admins bypass every capability check (they hold all capabilities), so
 * existing behaviour — where all admins are super admins — is unchanged. Regular
 * admins are granted access only if they hold the required capability.
 */
class EnsureAdminCan
{
    public function handle(Request $request, Closure $next, string $capability): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! ($user instanceof Admin)) {
            return response()->json([
                'message' => 'This action is only available to administrators.',
            ], 403);
        }

        if (! $user->hasCapability($capability)) {
            return response()->json([
                'message' => 'You do not have permission to perform this action.',
                'required_capability' => $capability,
            ], 403);
        }

        return $next($request);
    }
}
