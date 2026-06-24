<?php

namespace App\Enums;

enum ReviewStatus: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case HIDDEN = 'hidden';
    case FLAGGED = 'flagged';

    /**
     * Whether this review is publicly visible.
     */
    public function isPublic(): bool
    {
        return $this === self::APPROVED;
    }

    /**
     * Whether the landlord can respond to a review in this status.
     */
    public function canReceiveResponse(): bool
    {
        return $this === self::APPROVED;
    }
}
