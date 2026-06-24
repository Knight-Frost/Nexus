<?php

namespace App\Services;

use App\Enums\DocumentType;
use App\Models\Document;
use App\Models\User;

/**
 * TenantReadinessService
 *
 * Computes a tenant's "rental readiness" purely from real backend state.
 * Every item maps to a concrete column or persisted record — nothing here is
 * hardcoded. The percentage is derived from how many items are actually
 * complete, so it moves as the tenant fills in their profile / uploads docs.
 */
class TenantReadinessService
{
    /**
     * @return array{percentage:int, completed:int, total:int, items:list<array{key:string,label:string,complete:bool}>}
     */
    public function compute(User $user): array
    {
        $hasProofOfIncome = Document::query()
            ->where('owner_user_id', $user->id)
            ->where('document_type', DocumentType::PROOF_OF_INCOME->value)
            ->exists();

        $items = [
            [
                'key' => 'identity',
                'label' => 'ID verified',
                'complete' => $user->identity_verified === true,
            ],
            [
                'key' => 'contact',
                'label' => 'Contact phone',
                'complete' => filled($user->phone),
            ],
            [
                'key' => 'profile',
                'label' => 'Profile details',
                'complete' => filled($user->first_name)
                    && filled($user->last_name)
                    && $user->date_of_birth !== null
                    && filled($user->city),
            ],
            [
                'key' => 'next_of_kin',
                'label' => 'Next of kin',
                'complete' => filled($user->next_of_kin_name) && filled($user->next_of_kin_phone),
            ],
            [
                'key' => 'proof_of_income',
                'label' => 'Proof of income',
                'complete' => $hasProofOfIncome,
            ],
        ];

        $completed = count(array_filter($items, static fn (array $i): bool => $i['complete'] === true));
        $total = count($items);

        return [
            'percentage' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
            'completed' => $completed,
            'total' => $total,
            'items' => $items,
        ];
    }
}
