<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

/**
 * DocumentPolicy
 *
 * Authorises document actions.
 *
 * SECURITY:
 * - All comparisons use strict === with (int) casts to prevent type-juggling
 *   attacks where an int user ID is compared against a string value.
 * - Landlord / admin cross-access is NOT granted in this pass.  A landlord
 *   cannot read a tenant's document even if they share a contract.  Admin
 *   access to documents should be added in a dedicated admin controller +
 *   policy gate in a future pass.
 */
class DocumentPolicy
{
    /**
     * Any authenticated user may call the index action.
     * The controller always filters to the authenticated user's own documents,
     * so this gate is intentionally permissive.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * A user may view a document only if they are the owner OR the uploader.
     *
     * NOTE: Landlord / admin cross-access intentionally not granted here.
     */
    public function view(User $user, Document $document): bool
    {
        $userId = (int) $user->id;
        $ownerId = (int) $document->owner_user_id;
        $uploaderId = (int) $document->uploaded_by_id;

        return $userId === $ownerId || $userId === $uploaderId;
    }

    /**
     * Any authenticated user may create (upload) a document for themselves.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Only the document owner may delete their document.
     */
    public function delete(User $user, Document $document): bool
    {
        return (int) $user->id === (int) $document->owner_user_id;
    }
}
