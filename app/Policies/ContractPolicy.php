<?php

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;
use App\Enums\UserType;

class ContractPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->user_type, [UserType::LANDLORD, UserType::TENANT]);
    }

    public function view(User $user, Contract $contract): bool
    {
        return $user->id == $contract->landlord_id 
            || $user->id == $contract->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->user_type === UserType::LANDLORD;
    }

    public function send(User $user, Contract $contract): bool
    {
        return $user->id == $contract->landlord_id
            && $contract->status === \App\Enums\ContractStatus::DRAFT;
    }

    public function accept(User $user, Contract $contract): bool
    {
        return $user->id == $contract->tenant_id
            && $contract->canBeAccepted();
    }

    public function terminate(User $user, Contract $contract): bool
    {
        if (!$contract->canBeTerminated()) {
            return false;
        }

        return $user->id == $contract->landlord_id 
            || $user->id == $contract->tenant_id;
    }

    public function update(User $user, Contract $contract): bool
    {
        return false;
    }

    public function delete(User $user, Contract $contract): bool
    {
        return false;
    }
}