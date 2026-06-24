<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\ContractStatus;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\SuspendUserRequest;
use App\Models\Application;
use App\Models\Contract;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AdminUserController
 *
 * Admin management of platform users (tenants and landlords). Admins live in a
 * separate table, so the User model already excludes them from these queries.
 */
class AdminUserController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService
    ) {}

    /**
     * List users with optional type/status/search filters (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['sometimes', 'in:tenant,landlord'],
            'status' => ['sometimes', 'in:active,suspended,blocked,archived'],
            'search' => ['sometimes', 'string', 'max:255'],
        ]);

        $query = User::query()
            ->withCount(['properties', 'listings', 'applications'])
            ->orderBy('created_at', 'desc');

        if (! empty($filters['type'])) {
            $query->where('user_type', $filters['type']);
        }

        if (! empty($filters['status'])) {
            if ($filters['status'] === 'active') {
                $query->where('is_active', true)->whereNull('suspended_at');
            } elseif ($filters['status'] === 'suspended') {
                $query->whereNotNull('suspended_at');
            } elseif ($filters['status'] === 'blocked') {
                $query->where('account_status', 'blocked');
            } elseif ($filters['status'] === 'archived') {
                $query->where('account_status', 'archived');
            }
        }

        if (! empty($filters['search'])) {
            $term = '%'.strtolower($filters['search']).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(first_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Show a single user with management stats and recent activity.
     */
    public function show(User $user): JsonResponse
    {
        $user->append(['full_name', 'initials']);

        $properties = $user->isLandlord()
            ? $user->properties()->count()
            : 0;

        $listings = $user->isLandlord()
            ? $user->listings()->count()
            : 0;

        $activeContracts = Contract::where('status', ContractStatus::ACTIVE)
            ->where(function ($q) use ($user) {
                $q->where('landlord_id', $user->id)
                    ->orWhere('tenant_id', $user->id);
            })
            ->count();

        $applications = $user->isLandlord()
            ? Application::where('landlord_id', $user->id)->count()
            : Application::where('tenant_id', $user->id)->count();

        $recentContracts = Contract::where(function ($q) use ($user) {
            $q->where('landlord_id', $user->id)
                ->orWhere('tenant_id', $user->id);
        })
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->load('listing.unit.property', 'landlord', 'tenant');

        $recentApplications = Application::where(
            $user->isLandlord() ? 'landlord_id' : 'tenant_id',
            $user->id
        )
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->load('listing.unit.property', 'tenant');

        return response()->json([
            'user' => $user,
            'stats' => [
                'properties' => $properties,
                'listings' => $listings,
                'active_contracts' => $activeContracts,
                'applications' => $applications,
            ],
            'recent_contracts' => $recentContracts,
            'recent_applications' => $recentApplications,
        ]);
    }

    /**
     * Suspend a user account.
     */
    public function suspend(SuspendUserRequest $request, User $user): JsonResponse
    {
        if ($user->suspended_at !== null) {
            return response()->json([
                'message' => 'User is already suspended',
            ], 422);
        }

        $reason = $request->validated()['reason'];

        $user->suspended_at = now();
        $user->is_active = false;
        $user->account_status = 'suspended';
        $user->save();

        $this->auditService->logAccountSuspended($user, $request->user(), $reason);

        // Notify the affected user
        $eventId = "account-suspended:{$user->id}:".now()->toDateString();
        if (! $this->notificationService->exists($user, $eventId)) {
            $this->notificationService->create(
                user: $user,
                type: NotificationType::ACCOUNT_SUSPENDED,
                title: 'Account Suspended',
                message: "Your account has been suspended. Reason: {$reason}",
                data: [
                    'event_id' => $eventId,
                    'reason' => $reason,
                ]
            );
        }

        return response()->json([
            'message' => 'User suspended',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Reactivate a suspended (or inactive) user account.
     */
    public function activate(Request $request, User $user): JsonResponse
    {
        if ($user->suspended_at === null && $user->is_active && $user->account_status === AccountStatus::ACTIVE) {
            return response()->json([
                'message' => 'User is already active',
            ], 422);
        }

        $user->suspended_at = null;
        $user->is_active = true;
        $user->account_status = 'active';
        $user->save();

        $this->auditService->log(
            actor: $request->user(),
            action: 'account_reactivated',
            subject: $user,
            description: "Account reactivated: {$user->email}",
            severity: 'warning'
        );

        // Notify the affected user
        $eventId = "account-reactivated:{$user->id}:".now()->toDateString();
        if (! $this->notificationService->exists($user, $eventId)) {
            $this->notificationService->create(
                user: $user,
                type: NotificationType::ACCOUNT_REACTIVATED,
                title: 'Account Reactivated',
                message: 'Your account has been reactivated. You can now log in.',
                data: [
                    'event_id' => $eventId,
                ]
            );
        }

        return response()->json([
            'message' => 'User reactivated',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Block a user account (permanent, requires manual review to restore).
     */
    public function block(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        if ($user->account_status === AccountStatus::BLOCKED) {
            return response()->json(['message' => 'User is already blocked.'], 422);
        }

        $reason = $validated['reason'];

        $user->account_status = 'blocked';
        $user->is_active = false;
        $user->save();

        $this->auditService->log(
            actor: $request->user(),
            action: 'account_blocked',
            subject: $user,
            description: "Account blocked: {$user->email}",
            metadata: ['reason' => $reason],
            severity: 'critical'
        );

        $eventId = "account-blocked:{$user->id}:".now()->toDateString();
        if (! $this->notificationService->exists($user, $eventId)) {
            $this->notificationService->create(
                user: $user,
                type: NotificationType::ACCOUNT_BLOCKED,
                title: 'Account Blocked',
                message: "Your account has been blocked. Reason: {$reason}. Contact support for assistance.",
                data: ['event_id' => $eventId, 'reason' => $reason]
            );
        }

        return response()->json([
            'message' => 'User blocked.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Archive a user account (soft delete + mark archived).
     */
    public function archive(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        if ($user->account_status === AccountStatus::ARCHIVED) {
            return response()->json(['message' => 'User is already archived.'], 422);
        }

        $reason = $validated['reason'];

        $user->account_status = 'archived';
        $user->is_active = false;
        $user->save();

        $this->auditService->log(
            actor: $request->user(),
            action: 'account_archived',
            subject: $user,
            description: "Account archived: {$user->email}",
            metadata: ['reason' => $reason],
            severity: 'critical'
        );

        $eventId = "account-archived:{$user->id}:".now()->toDateString();
        if (! $this->notificationService->exists($user, $eventId)) {
            $this->notificationService->create(
                user: $user,
                type: NotificationType::ACCOUNT_ARCHIVED,
                title: 'Account Archived',
                message: "Your account has been archived. Reason: {$reason}. Contact support for assistance.",
                data: ['event_id' => $eventId, 'reason' => $reason]
            );
        }

        $user->delete(); // soft delete

        // After soft-delete the $user instance still holds the up-to-date data.
        // We reload via withTrashed() so the deleted_at timestamp is included.
        $freshUser = User::withTrashed()->find($user->id);

        return response()->json([
            'message' => 'User archived.',
            'user' => $freshUser,
        ]);
    }
}
