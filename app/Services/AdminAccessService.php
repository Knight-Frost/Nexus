<?php

namespace App\Services;

use App\Enums\AdminCapability;
use App\Models\Admin;
use App\Models\User;
use App\Notifications\AdminAccessChangedNotification;
use App\Notifications\AdminInvitationNotification;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * AdminAccessService
 *
 * Business logic for the "Manage Users & Permissions" (access control) feature.
 * Owns the Super Admin safety invariants, audit logging, and affected-admin
 * email notifications. Controllers stay thin and delegate here.
 *
 * Authorization split (enforced by routes/FormRequests, re-affirmed here where
 * it protects an invariant):
 *   - Reading access data requires the `manage_access` capability.
 *   - EVERY mutation below is super-admin-only.
 */
class AdminAccessService
{
    public function __construct(
        protected AuditService $auditService,
    ) {}

    // ---------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------

    /**
     * Real platform-wide access counts. Computed with dedicated COUNT queries,
     * never derived from a paginated page.
     *
     * @return array<string, int>
     */
    public function summary(): array
    {
        return [
            'members_total' => User::count() + Admin::count(),
            'tenants' => User::where('user_type', 'tenant')->count(),
            'landlords' => User::where('user_type', 'landlord')->count(),
            'admins' => Admin::count(),
            'super_admins' => Admin::where('is_super_admin', true)->count(),
            'scoped_admins' => Admin::where('is_super_admin', false)->count(),
            'pending_invites' => Admin::whereNotNull('invited_at')->whereNull('invite_accepted_at')->count(),
            'deactivated_admins' => Admin::where('is_active', false)->count(),
            'suspended_users' => User::whereNotNull('suspended_at')->count(),
            'blocked_users' => User::where('account_status', 'blocked')->count(),
            // Archived users are soft-deleted, so they must be counted withTrashed.
            'archived_users' => User::withTrashed()->where('account_status', 'archived')->count(),
        ];
    }

    /**
     * The read-only role/permission matrix.
     *
     * Two honest halves:
     *  - Baseline role abilities for Tenant/Landlord (what they can do) — locked,
     *    enforced by route middleware + per-resource policies.
     *  - Granular admin capabilities — assignable per regular admin, always held
     *    (and locked on) for Super Admin.
     *
     * @return array<string, mixed>
     */
    public function rolesMatrix(): array
    {
        $roles = [
            ['id' => 'tenant', 'label' => 'Tenant', 'member_count' => User::where('user_type', 'tenant')->count(), 'locked' => true, 'note' => 'Baseline role — set at signup'],
            ['id' => 'landlord', 'label' => 'Landlord', 'member_count' => User::where('user_type', 'landlord')->count(), 'locked' => true, 'note' => 'Baseline role — set at signup'],
            ['id' => 'admin', 'label' => 'Admin', 'member_count' => Admin::where('is_super_admin', false)->count(), 'locked' => false, 'note' => 'Scoped — capabilities assigned per admin'],
            ['id' => 'super_admin', 'label' => 'Super Admin', 'member_count' => Admin::where('is_super_admin', true)->count(), 'locked' => true, 'note' => 'Full authority — cannot be partially disabled'],
        ];

        $baselineReason = 'Baseline role boundary — enforced by backend policies';
        $superReason = 'Super Admin has full platform authority and cannot be partially disabled';

        // Baseline abilities: honest, read-only reflection of what the role
        // middleware + policies allow. Admin/Super Admin can do everything here.
        $baseline = [
            ['key' => 'browse_listings', 'label' => 'Browse listings', 'description' => 'View published homes', 'tenant' => true, 'landlord' => true],
            ['key' => 'save_apply', 'label' => 'Save & apply to homes', 'description' => 'Shortlist and submit applications', 'tenant' => true, 'landlord' => false],
            ['key' => 'create_listings', 'label' => 'Create & manage own listings', 'description' => 'Publish and edit their own properties', 'tenant' => false, 'landlord' => true],
            ['key' => 'manage_own_contracts', 'label' => 'Draft & send own contracts', 'description' => 'Landlords draft; tenants accept', 'tenant' => false, 'landlord' => true],
            ['key' => 'view_own_ledger', 'label' => 'View own ledger & pay rent', 'description' => 'See their own financial records', 'tenant' => true, 'landlord' => true],
        ];

        $groups = [];
        $groups[] = [
            'group' => 'Platform roles (baseline)',
            'readonly' => true,
            'capabilities' => array_map(function (array $row) use ($baselineReason, $superReason) {
                return [
                    'key' => $row['key'],
                    'label' => $row['label'],
                    'description' => $row['description'],
                    'enforced' => true,
                    'cells' => [
                        'tenant' => ['state' => $row['tenant'] ? 'granted' : 'denied', 'locked' => true, 'reason' => $baselineReason],
                        'landlord' => ['state' => $row['landlord'] ? 'granted' : 'denied', 'locked' => true, 'reason' => $baselineReason],
                        'admin' => ['state' => 'granted', 'locked' => true, 'reason' => 'Admins have full platform reach'],
                        'super_admin' => ['state' => 'granted', 'locked' => true, 'reason' => $superReason],
                    ],
                ];
            }, $baseline),
        ];

        // Granular admin capabilities, grouped by AdminCapability::group().
        $byGroup = [];
        foreach (AdminCapability::cases() as $cap) {
            $byGroup[$cap->group()][] = $cap;
        }

        foreach ($byGroup as $groupName => $caps) {
            $groups[] = [
                'group' => $groupName,
                'readonly' => false,
                'capabilities' => array_map(function (AdminCapability $cap) use ($baselineReason, $superReason) {
                    return [
                        'key' => $cap->value,
                        'label' => $cap->label(),
                        'description' => $cap->description().($cap->isEnforced() ? '' : ' (defined; not yet enforced)'),
                        'enforced' => $cap->isEnforced(),
                        'cells' => [
                            'tenant' => ['state' => 'denied', 'locked' => true, 'reason' => $baselineReason],
                            'landlord' => ['state' => 'denied', 'locked' => true, 'reason' => $baselineReason],
                            // Admin column is assignable per-admin by a super
                            // admin (edited in the team detail drawer). A regular
                            // admin never holds a capability unless granted.
                            'admin' => ['state' => 'assignable', 'locked' => false, 'reason' => 'Granted per admin by a super admin'],
                            'super_admin' => ['state' => 'granted', 'locked' => true, 'reason' => $superReason],
                        ],
                    ];
                }, $caps),
            ];
        }

        return [
            'roles' => $roles,
            'groups' => $groups,
            'note' => 'Manage Users & Permissions is restricted to super admins by default. A super admin may grant selected admins the “Manage access” capability to open this page — but super-admin-only actions (inviting admins, promotions, capability changes) always stay protected. Tenant and Landlord boundaries are system-defined and read-only.',
        ];
    }

    /**
     * Paginated tenant/landlord list, access lens.
     */
    public function paginateMembers(array $filters): LengthAwarePaginator
    {
        $status = $filters['status'] ?? null;

        $query = User::query()
            ->when($status === 'archived', fn ($q) => $q->withTrashed())
            ->withCount(['properties', 'listings', 'applications'])
            ->orderByDesc('created_at');

        if (! empty($filters['type'])) {
            $query->where('user_type', $filters['type']);
        }

        if ($status) {
            if ($status === 'active') {
                $query->where('is_active', true)->whereNull('suspended_at');
            } elseif ($status === 'suspended') {
                $query->whereNotNull('suspended_at');
            } elseif ($status === 'blocked') {
                $query->where('account_status', 'blocked');
            } elseif ($status === 'archived') {
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

        $members = $query->paginate(20);
        $members->getCollection()->each->append(['full_name', 'initials', 'avatar_url']);

        return $members;
    }

    /**
     * The full admin team (small set), super admins first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function team(): array
    {
        return Admin::query()
            ->orderByDesc('is_super_admin')
            ->orderBy('name')
            ->get()
            ->map(fn (Admin $a) => $this->formatAdmin($a))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function formatAdmin(Admin $admin): array
    {
        $status = ! $admin->is_active
            ? 'deactivated'
            : ($admin->isPendingInvite() ? 'invited' : 'active');

        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'is_super_admin' => $admin->is_super_admin,
            'is_active' => $admin->is_active,
            'status' => $status,
            'is_pending_invite' => $admin->isPendingInvite(),
            'capabilities' => $admin->grantedCapabilities(),
            'capability_count' => count($admin->grantedCapabilities()),
            'last_login_at' => $admin->last_login_at?->toISOString(),
            'invited_at' => $admin->invited_at?->toISOString(),
            'created_at' => $admin->created_at?->toISOString(),
        ];
    }

    // ---------------------------------------------------------------------
    // Mutations (super-admin only — enforced by FormRequest authorize())
    // ---------------------------------------------------------------------

    /**
     * Invite a new admin: create the record + email a set-password link.
     */
    public function invite(Admin $actor, array $data): Admin
    {
        $email = strtolower(trim($data['email']));

        if (Admin::where('email', $email)->exists()) {
            abort(422, 'An admin with this email already exists.');
        }

        $isSuper = (bool) ($data['is_super_admin'] ?? false);
        $capabilities = $isSuper ? null : $this->sanitizeCapabilities($data['capabilities'] ?? []);

        $admin = Admin::create([
            'name' => trim($data['name'] ?? '') ?: $this->nameFromEmail($email),
            'email' => $email,
            'password' => Str::password(40),
            'is_super_admin' => $isSuper,
            'is_active' => true,
            'capabilities' => $capabilities,
            'invited_at' => now(),
            'invite_accepted_at' => null,
        ]);

        $this->sendInvitationEmail($admin, $actor, $isSuper);

        $this->auditService->log(
            actor: $actor,
            action: 'admin_invited',
            subject: $admin,
            description: "Invited {$admin->email} to the admin team",
            newValues: ['is_super_admin' => $isSuper, 'capabilities' => $capabilities],
            metadata: ['note' => $data['note'] ?? null],
            severity: 'warning',
        );

        return $admin;
    }

    public function resendInvite(Admin $actor, Admin $target): Admin
    {
        if (! $target->isPendingInvite()) {
            abort(422, 'This admin has already accepted their invitation.');
        }

        $this->sendInvitationEmail($target, $actor, $target->is_super_admin);

        $this->auditService->log(
            actor: $actor,
            action: 'admin_invite_resent',
            subject: $target,
            description: "Resent admin invitation to {$target->email}",
            severity: 'info',
        );

        return $target;
    }

    public function revokeInvite(Admin $actor, Admin $target, string $reason): void
    {
        if (! $target->isPendingInvite()) {
            abort(422, 'Only a pending, unaccepted invitation can be revoked.');
        }

        // Log BEFORE deleting so the record survives with the target snapshot.
        $this->auditService->log(
            actor: $actor,
            action: 'admin_invite_revoked',
            subject: $target,
            description: "Revoked admin invitation for {$target->email}",
            metadata: ['reason' => $reason, 'email' => $target->email],
            severity: 'warning',
        );

        Password::broker('admins')->getRepository()->delete($target);
        $target->delete(); // allowed: pending, never accepted
    }

    public function updateCapabilities(Admin $actor, Admin $target, array $capabilities, string $reason): Admin
    {
        if ($target->is_super_admin) {
            abort(422, 'Super admins already hold all capabilities. Demote to a regular admin to scope capabilities.');
        }

        $old = $target->grantedCapabilities();
        $new = $this->sanitizeCapabilities($capabilities);

        $target->capabilities = $new;
        $target->save();

        $this->auditService->log(
            actor: $actor,
            action: 'admin_capabilities_updated',
            subject: $target,
            description: "Updated admin capabilities for {$target->email}",
            oldValues: ['capabilities' => $old],
            newValues: ['capabilities' => $new],
            metadata: ['reason' => $reason],
            severity: 'warning',
        );

        $target->notify(new AdminAccessChangedNotification(
            'Your admin access changed',
            'A super admin updated the capabilities on your admin account.',
        ));

        return $target->fresh();
    }

    public function promoteSuper(Admin $actor, Admin $target, string $reason): Admin
    {
        if ($target->is_super_admin) {
            abort(422, 'This admin is already a super admin.');
        }

        $target->is_super_admin = true;
        $target->capabilities = null; // supers hold all capabilities implicitly
        $target->save();

        $this->auditService->log(
            actor: $actor,
            action: 'admin_promoted_super',
            subject: $target,
            description: "Promoted {$target->email} to super admin",
            metadata: ['reason' => $reason],
            severity: 'critical',
        );

        $target->notify(new AdminAccessChangedNotification(
            'You are now a Super Admin',
            'A super admin promoted your account to Super Admin — you now have full platform authority.',
        ));

        return $target->fresh();
    }

    public function demoteSuper(Admin $actor, Admin $target, string $reason, array $capabilities = []): Admin
    {
        if (! $target->is_super_admin) {
            abort(422, 'This admin is not a super admin.');
        }

        $this->guardLastActiveSuperAdmin($target, 'demote');

        $target->is_super_admin = false;
        $target->capabilities = $this->sanitizeCapabilities($capabilities);
        $target->save();

        $this->auditService->log(
            actor: $actor,
            action: 'admin_demoted_super',
            subject: $target,
            description: "Demoted {$target->email} from super admin",
            oldValues: ['is_super_admin' => true],
            newValues: ['is_super_admin' => false, 'capabilities' => $target->capabilities],
            metadata: ['reason' => $reason],
            severity: 'critical',
        );

        $target->notify(new AdminAccessChangedNotification(
            'Your Super Admin access was removed',
            'A super admin changed your account to a regular admin with scoped capabilities.',
        ));

        return $target->fresh();
    }

    public function deactivate(Admin $actor, Admin $target, string $reason): Admin
    {
        if ($actor->id === $target->id) {
            abort(422, 'You cannot deactivate your own admin account.');
        }

        $this->guardLastActiveSuperAdmin($target, 'deactivate');

        $target->is_active = false;
        $target->save();

        $this->auditService->log(
            actor: $actor,
            action: 'admin_deactivated',
            subject: $target,
            description: "Deactivated admin access for {$target->email}",
            metadata: ['reason' => $reason],
            severity: 'critical',
        );

        $target->notify(new AdminAccessChangedNotification(
            'Your admin access was deactivated',
            'A super admin has deactivated your admin console access.',
        ));

        return $target->fresh();
    }

    public function activate(Admin $actor, Admin $target, ?string $reason = null): Admin
    {
        $target->is_active = true;
        $target->save();

        $this->auditService->log(
            actor: $actor,
            action: 'admin_reactivated',
            subject: $target,
            description: "Reactivated admin access for {$target->email}",
            metadata: ['reason' => $reason],
            severity: 'warning',
        );

        $target->notify(new AdminAccessChangedNotification(
            'Your admin access was reactivated',
            'A super admin has reactivated your admin console access. You can sign in again.',
        ));

        return $target->fresh();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /**
     * The single invariant protecting the "final key to the building": neither
     * demotion nor deactivation may remove the last ACTIVE super admin.
     */
    protected function guardLastActiveSuperAdmin(Admin $target, string $action): void
    {
        if (! ($target->is_super_admin && $target->is_active)) {
            return;
        }

        $activeSupers = Admin::where('is_super_admin', true)->where('is_active', true)->count();

        if ($activeSupers <= 1) {
            $verb = $action === 'deactivate' ? 'deactivate' : 'demote';
            abort(422, "You cannot {$verb} the last active super admin. Promote another super admin first.");
        }
    }

    /**
     * @param  array<int, string>  $capabilities
     * @return list<string>
     */
    protected function sanitizeCapabilities(array $capabilities): array
    {
        $valid = AdminCapability::values();

        return array_values(array_unique(array_filter(
            $capabilities,
            fn ($c) => is_string($c) && in_array($c, $valid, true),
        )));
    }

    protected function sendInvitationEmail(Admin $admin, Admin $inviter, bool $isSuper): void
    {
        $token = Password::broker('admins')->createToken($admin);
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $url = $frontendUrl.'/accept-invite?token='.urlencode($token).'&email='.urlencode($admin->email);

        $admin->notify(new AdminInvitationNotification($url, $inviter->name, $isSuper));
    }

    protected function nameFromEmail(string $email): string
    {
        $local = Str::before($email, '@');

        return Str::of($local)->replace(['.', '_', '-'], ' ')->title()->value();
    }
}
