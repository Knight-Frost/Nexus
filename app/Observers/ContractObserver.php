<?php

namespace App\Observers;

use App\Models\Contract;
use App\Enums\ContractStatus;
use App\Services\LedgerService;

/**
 * ContractObserver
 * 
 * Handles contract events.
 * When contract becomes ACTIVE, generate first rent ledger entry.
 */
class ContractObserver
{
    public function __construct(
        protected LedgerService $ledgerService
    ) {}

    /**
     * Handle the Contract "updated" event.
     */
    public function updated(Contract $contract): void
    {
        // Check if status changed to ACTIVE
        if ($contract->isDirty('status') && $contract->status === ContractStatus::ACTIVE) {
            // Generate first rent entry
            $this->ledgerService->generateFirstRentEntry($contract);
        }
    }
}