<?php

namespace App\Enums;

enum LedgerStatus: string
{
    case PENDING = 'pending';
    case PAID = 'paid';
    case OVERDUE = 'overdue';
    case WAIVED = 'waived';

    /**
     * Check if payment is due
     */
    public function isDue(): bool
    {
        return in_array($this, [self::PENDING, self::OVERDUE]);
    }

    /**
     * Check if this entry is overdue
     */
    public function isOverdue(): bool
    {
        return $this === self::OVERDUE;
    }

    /**
     * Check if this entry is settled (paid or waived)
     */
    public function isSettled(): bool
    {
        return in_array($this, [self::PAID, self::WAIVED]);
    }
}
