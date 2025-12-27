<?php

namespace App\Enums;

enum ContractStatus: string
{
    case DRAFT = 'draft';
    case PENDING_TENANT = 'pending_tenant';
    case ACTIVE = 'active';
    case TERMINATED = 'terminated';
    case EXPIRED = 'expired';

    /**
     * Check if contract can be terminated
     */
    public function canBeTerminated(): bool
    {
        return $this === self::ACTIVE;
    }

    /**
     * Check if contract can be accepted by tenant
     */
    public function canBeAccepted(): bool
    {
        return $this === self::PENDING_TENANT;
    }

    /**
     * Check if contract is in final state
     */
    public function isFinal(): bool
    {
        return in_array($this, [self::TERMINATED, self::EXPIRED]);
    }
}
