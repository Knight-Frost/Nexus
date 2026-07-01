<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminAccessActionRequest;
use App\Http\Requests\Admin\InviteAdminRequest;
use App\Http\Requests\Admin\UpdateAdminCapabilitiesRequest;
use App\Models\Admin;
use App\Services\AdminAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AdminAccessController — "Manage Users & Permissions" (access control).
 *
 * Thin controller. Reads require the `manage_access` capability (route
 * middleware). Every mutation is super-admin-only; that gate lives in the
 * FormRequest authorize() (or an inline check for the no-reason actions).
 */
class AdminAccessController extends Controller
{
    public function __construct(
        protected AdminAccessService $service,
    ) {}

    public function summary(): JsonResponse
    {
        return response()->json($this->service->summary());
    }

    public function roles(): JsonResponse
    {
        return response()->json($this->service->rolesMatrix());
    }

    public function members(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['sometimes', 'in:tenant,landlord'],
            'status' => ['sometimes', 'in:active,suspended,blocked,archived'],
            'search' => ['sometimes', 'string', 'max:255'],
        ]);

        return response()->json($this->service->paginateMembers($filters));
    }

    public function admins(): JsonResponse
    {
        return response()->json(['data' => $this->service->team()]);
    }

    public function showAdmin(Admin $admin): JsonResponse
    {
        return response()->json(['admin' => $this->service->formatAdmin($admin)]);
    }

    public function invite(InviteAdminRequest $request): JsonResponse
    {
        $admin = $this->service->invite($request->user(), $request->validated());

        return response()->json([
            'message' => 'Admin invited. A set-password email has been sent.',
            'admin' => $this->service->formatAdmin($admin),
        ], 201);
    }

    public function resendInvite(Request $request, Admin $admin): JsonResponse
    {
        $this->ensureSuper($request);
        $this->service->resendInvite($request->user(), $admin);

        return response()->json(['message' => 'Invitation resent.']);
    }

    public function revokeInvite(AdminAccessActionRequest $request, Admin $admin): JsonResponse
    {
        $this->service->revokeInvite($request->user(), $admin, $request->validated('reason'));

        return response()->json(['message' => 'Invitation revoked.']);
    }

    public function updateCapabilities(UpdateAdminCapabilitiesRequest $request, Admin $admin): JsonResponse
    {
        $updated = $this->service->updateCapabilities(
            $request->user(),
            $admin,
            $request->validated('capabilities'),
            $request->validated('reason'),
        );

        return response()->json([
            'message' => 'Capabilities updated.',
            'admin' => $this->service->formatAdmin($updated),
        ]);
    }

    public function promoteSuper(AdminAccessActionRequest $request, Admin $admin): JsonResponse
    {
        $updated = $this->service->promoteSuper($request->user(), $admin, $request->validated('reason'));

        return response()->json([
            'message' => 'Admin promoted to super admin.',
            'admin' => $this->service->formatAdmin($updated),
        ]);
    }

    public function demoteSuper(AdminAccessActionRequest $request, Admin $admin): JsonResponse
    {
        $updated = $this->service->demoteSuper(
            $request->user(),
            $admin,
            $request->validated('reason'),
            $request->validated('capabilities', []),
        );

        return response()->json([
            'message' => 'Super admin demoted to regular admin.',
            'admin' => $this->service->formatAdmin($updated),
        ]);
    }

    public function deactivate(AdminAccessActionRequest $request, Admin $admin): JsonResponse
    {
        $updated = $this->service->deactivate($request->user(), $admin, $request->validated('reason'));

        return response()->json([
            'message' => 'Admin access deactivated.',
            'admin' => $this->service->formatAdmin($updated),
        ]);
    }

    public function activate(Request $request, Admin $admin): JsonResponse
    {
        $this->ensureSuper($request);
        $updated = $this->service->activate($request->user(), $admin);

        return response()->json([
            'message' => 'Admin access reactivated.',
            'admin' => $this->service->formatAdmin($updated),
        ]);
    }

    /**
     * Inline super-admin gate for the no-reason actions (resend, activate).
     */
    protected function ensureSuper(Request $request): void
    {
        abort_unless(
            $request->user() instanceof Admin && $request->user()->is_super_admin,
            403,
            'Only a super admin can manage the admin team.',
        );
    }
}
