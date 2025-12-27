<?php

namespace App\Policies;

use App\Models\LedgerEntry;
use App\Models\User;
use App\Enums\UserType;

/**
 * LedgerEntryPolicy
 * 
 * Authorization rules for ledger access.
 * 
 * CRITICAL: Ledger entries are read-only for users.
 * No user can modify or delete ledger entries.
 */
class LedgerEntryPolicy
{
    /**
     * Determine if user can view any ledger entries
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->user_type, [UserType::LANDLORD, UserType::TENANT]);
    }

    /**
     * Determine if user can view the ledger entry
     */
    public function view(User $user, LedgerEntry $entry): bool
    {
        return $user->id == $entry->landlord_id 
            || $user->id == $entry->tenant_id;
    }

    /**
     * No user can create ledger entries directly
     * (Only system via LedgerService)
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * No user can update ledger entries
     * (Immutability enforced)
     */
    public function update(User $user, LedgerEntry $entry): bool
    {
        return false;
    }

    /**
     * No user can delete ledger entries
     * (Immutability enforced)
     */
    public function delete(User $user, LedgerEntry $entry): bool
    {
        return false;
    }
}
