<?php

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;
use App\Enums\UserType;

/**
 * ContractPolicy
 * 
 * Authorization rules for contract management.
 */
class ContractPolicy
{
    /**
     * Determine if user can view any contracts
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->user_type, [UserType::LANDLORD, UserType::TENANT]);
    }

    /**
     * Determine if user can view the contract
     */
    public function view(User $user, Contract $contract): bool
    {
        return $user->id === $contract->landlord_id 
            || $user->id === $contract->tenant_id;
    }

    /**
     * Determine if user can create contracts (landlords only)
     */
    public function create(User $user): bool
    {
        return $user->user_type === UserType::LANDLORD;
    }

    /**
     * Determine if landlord can send contract to tenant
     */
    public function send(User $user, Contract $contract): bool
    {
        return $user->id === $contract->landlord_id
            && $contract->status === \App\Enums\ContractStatus::DRAFT;
    }

    /**
     * Determine if tenant can accept contract
     */
    public function accept(User $user, Contract $contract): bool
    {
        return $user->id === $contract->tenant_id
            && $contract->canBeAccepted();
    }

    /**
     * Determine if user can terminate contract
     */
    public function terminate(User $user, Contract $contract): bool
    {
        if (!$contract->canBeTerminated()) {
            return false;
        }

        return $user->id === $contract->landlord_id 
            || $user->id === $contract->tenant_id;
    }

    /**
     * Determine if user can update the contract
     * Contracts are immutable after creation
     */
    public function update(User $user, Contract $contract): bool
    {
        return false; // Contracts are immutable
    }

    /**
     * Determine if user can delete the contract
     * No soft deletes allowed
     */
    public function delete(User $user, Contract $contract): bool
    {
        return false; // No deletes allowed
    }
}
