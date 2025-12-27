<?php

namespace App\Enums;

enum LedgerType: string
{
    case RENT = 'rent';
    case LATE_FEE = 'late_fee';

    /**
     * Check if this is a rent entry
     */
    public function isRent(): bool
    {
        return $this === self::RENT;
    }

    /**
     * Check if this is a late fee entry
     */
    public function isLateFee(): bool
    {
        return $this === self::LATE_FEE;
    }
}
