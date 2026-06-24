<?php

namespace App\Policies;

use App\Enums\UserType;
use App\Models\Application;
use App\Models\User;

/**
 * ApplicationPolicy
 *
 * Authorizes application actions based on user role and ownership.
 * SECURITY: Uses strict type comparisons (===) and (int) casts throughout
 * to guard against int/string type mismatch on IDs.
 */
class ApplicationPolicy
{
    /**
     * Determine whether the user can list applications.
     * Both tenants and landlords may list their own applications.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->user_type, [UserType::LANDLORD, UserType::TENANT], true);
    }

    /**
     * Determine whether the user can view a specific application.
     * Only the applying tenant or the target landlord may view it.
     */
    public function view(User $user, Application $application): bool
    {
        $userId = (int) $user->id;
        $tenantId = (int) $application->tenant_id;
        $landlordId = (int) $application->landlord_id;

        return $userId === $tenantId || $userId === $landlordId;
    }

    /**
     * Determine whether the user can create an application.
     * Only tenants may apply.
     */
    public function create(User $user): bool
    {
        return $user->user_type === UserType::TENANT;
    }

    /**
     * Determine whether the tenant can withdraw their own application.
     * Only the submitting tenant may withdraw, and only while it is still active.
     */
    public function withdraw(User $user, Application $application): bool
    {
        $userId = (int) $user->id;
        $tenantId = (int) $application->tenant_id;

        return $userId === $tenantId && $application->status->canBeWithdrawn();
    }

    /**
     * Determine whether the landlord can decide (approve/reject) an application.
     * Only the listing's landlord may decide, and only while the application is active.
     */
    public function decide(User $user, Application $application): bool
    {
        $userId = (int) $user->id;
        $landlordId = (int) $application->landlord_id;

        return $userId === $landlordId && $application->status->isActive();
    }
}
