<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

/**
 * ConversationPolicy
 *
 * Controls access to individual Conversation resources.
 * "create" is not gated here — any authenticated tenant may start a
 * conversation with a listing's landlord via the store action.
 *
 * SECURITY: Uses strict int casts when comparing IDs (same pattern as
 * ContractPolicy) to guard against string/int mismatches.
 */
class ConversationPolicy
{
    /**
     * The user may view a conversation only if they are a participant.
     */
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user);
    }

    /**
     * The user may send a message only if they are a participant AND the
     * conversation is still active (not archived or closed).
     */
    public function sendMessage(User $user, Conversation $conversation): bool
    {
        return $conversation->hasParticipant($user)
            && $conversation->status === 'active';
    }
}
