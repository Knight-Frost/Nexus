<?php

namespace App\Services;

use App\Enums\LedgerStatus;
use App\Enums\LedgerType;
use App\Models\LedgerEntry;
use Illuminate\Support\Collection;

/**
 * LedgerPresentationService
 *
 * Pure read/derive helpers over the immutable ledger. Computes a deterministic
 * display reference and a running outstanding balance per contract. Nothing here
 * mutates or persists state — these are projections of existing entry fields.
 */
class LedgerPresentationService
{
    /**
     * Deterministic, human-readable reference for a ledger entry.
     *
     * Pure function of existing fields: {PREFIX}-{Ymd}-{first 6 of UUID upper}.
     * PREFIX by type: rent→INV, payment→RCPT, late_fee→FEE, refund→REF.
     */
    public function reference(LedgerEntry $entry): string
    {
        $prefix = match ($entry->type) {
            LedgerType::RENT => 'INV',
            LedgerType::PAYMENT => 'RCPT',
            LedgerType::LATE_FEE => 'FEE',
            LedgerType::REFUND => 'REF',
        };

        $date = ($entry->due_date ?? $entry->created_at)->format('Ymd');
        $idPart = strtoupper(substr((string) $entry->id, 0, 6));

        return "{$prefix}-{$date}-{$idPart}";
    }

    /**
     * Effect of a single entry on its contract's outstanding balance (in cents).
     *
     * - rent / late_fee (not waived) increase the balance
     * - refund increases the balance
     * - payment decreases the balance
     * - waived obligations contribute 0
     */
    public function balanceDelta(LedgerEntry $entry): int
    {
        return match ($entry->type) {
            LedgerType::RENT, LedgerType::LATE_FEE => $entry->status === LedgerStatus::WAIVED
                ? 0
                : (int) $entry->amount_cents,
            LedgerType::REFUND => (int) $entry->amount_cents,
            LedgerType::PAYMENT => -1 * (int) $entry->amount_cents,
        };
    }

    /**
     * Given a set of entries, return a map of [entry id => balance_after_cents].
     *
     * Entries are grouped by contract and replayed chronologically
     * (created_at asc, tie-break by id) so each entry's balance reflects every
     * prior entry on the SAME contract.
     *
     * @param  Collection<int, LedgerEntry>  $entries
     * @return array<string, int>
     */
    public function balancesAfter(Collection $entries): array
    {
        $balances = [];

        foreach ($entries->groupBy('contract_id') as $group) {
            $sorted = $group->sort(function (LedgerEntry $a, LedgerEntry $b) {
                return [$a->created_at, (string) $a->id] <=> [$b->created_at, (string) $b->id];
            });

            $running = 0;
            foreach ($sorted as $entry) {
                $running += $this->balanceDelta($entry);
                $balances[$entry->id] = $running;
            }
        }

        return $balances;
    }
}
