<?php

namespace App\Enums;

/**
 * ApplicationStatus Enum
 *
 * Represents the lifecycle of a tenant rental application.
 * SECURITY: Status transitions are enforced in the ApplicationPolicy.
 */
enum ApplicationStatus: string
{
    case SUBMITTED = 'submitted';
    case IN_REVIEW = 'in_review';
    case LANDLORD_REVIEW = 'landlord_review';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case WITHDRAWN = 'withdrawn';

    /**
     * Check if the application is in an active (non-final) state.
     */
    public function isActive(): bool
    {
        return in_array($this, [
            self::SUBMITTED,
            self::IN_REVIEW,
            self::LANDLORD_REVIEW,
        ], true);
    }

    /**
     * Check if the application is in a final state.
     */
    public function isFinal(): bool
    {
        return in_array($this, [
            self::APPROVED,
            self::REJECTED,
            self::WITHDRAWN,
        ], true);
    }

    /**
     * Check if the application can be withdrawn by the tenant.
     */
    public function canBeWithdrawn(): bool
    {
        return $this->isActive();
    }
}
