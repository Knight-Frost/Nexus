<?php

namespace App\Policies;

use App\Enums\ReviewStatus;
use App\Enums\UserType;
use App\Models\Review;
use App\Models\User;

/**
 * ReviewPolicy
 *
 * Gate checks for review operations.
 * NOTE: Eligibility (contract ownership, status) is enforced inside ReviewService,
 * not here — the policy only enforces role and ownership.
 */
class ReviewPolicy
{
    /**
     * Tenants can create reviews (eligibility checked in ReviewService).
     */
    public function create(User $user): bool
    {
        return $user->user_type === UserType::TENANT;
    }

    /**
     * A reviewer may update their own review while it is still pending.
     */
    public function update(User $user, Review $review): bool
    {
        return (int) $review->reviewer_user_id === (int) $user->id
            && $review->status === ReviewStatus::PENDING;
    }

    /**
     * Only the review's property landlord may respond.
     * Full eligibility (approved status) is checked in ReviewService::respond().
     */
    public function respond(User $user, Review $review): bool
    {
        return (int) $review->landlord_id === (int) $user->id;
    }

    /**
     * Tenant can view their own reviews.
     */
    public function view(User $user, Review $review): bool
    {
        return (int) $review->reviewer_user_id === (int) $user->id;
    }
}
