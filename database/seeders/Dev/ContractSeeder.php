<?php

namespace Database\Seeders\Dev;

use App\Enums\ContractStatus;
use App\Enums\TerminatedBy;
use App\Models\Contract;

/**
 * ContractSeeder — leases across the full lifecycle.
 *
 * Driven by the catalog's per-unit `contract` scenario:
 *   draft → pending_tenant → active → terminated → expired.
 *
 * Active contracts are created ALREADY active on purpose: the ContractObserver
 * only auto-generates rent on the pending→active *transition*, not on insert, so
 * LedgerSeeder can own the entire (immutable, consistent) ledger with no
 * double-generation. rent_amount is converted from the unit's major-unit rent to
 * integer cents, matching the contracts schema.
 */
class ContractSeeder extends DevSeeder
{
    public function run(): void
    {
        $counts = [];

        foreach (SeedCatalog::UNITS as $u) {
            if (! $u['contract'] || ! $u['tenant']) {
                continue;
            }

            $unit = $this->unitFromCatalog($u);
            $tenant = $this->user($u['tenant']);
            if (! $unit || ! $tenant || ! ($listing = $this->listingForUnit($unit))) {
                continue;
            }

            $attributes = array_merge(
                [
                    'landlord_id' => $listing->landlord_id,
                    'tenant_id' => $tenant->id,
                    'rent_amount' => (int) round($u['rent'] * 100), // major units → cents
                    'currency' => $this->currency(),
                    'billing_cycle' => 'monthly',
                    'payment_day' => 1,
                ],
                $this->lifecycleFields($u['contract'], (int) $u['months']),
            );

            Contract::updateOrCreate(['listing_id' => $listing->id], $attributes);
            $counts[$u['contract']] = ($counts[$u['contract']] ?? 0) + 1;
        }

        $summary = collect($counts)->map(fn ($n, $s) => "{$s}:{$n}")->implode(', ');
        $this->command?->info("  ✓ Contracts: {$summary}.");
    }

    /**
     * Status + dated period for a lifecycle scenario.
     *
     * @return array<string,mixed>
     */
    protected function lifecycleFields(string $scenario, int $months): array
    {
        return match ($scenario) {
            'active' => [
                'status' => ContractStatus::ACTIVE->value,
                'start_date' => now()->subMonthsNoOverflow(max($months, 1))->startOfMonth(),
                'end_date' => now()->subMonthsNoOverflow(max($months, 1))->startOfMonth()->addYear(),
            ],
            'pending_tenant' => [
                'status' => ContractStatus::PENDING_TENANT->value,
                'start_date' => now()->addDays(14),
                'end_date' => now()->addDays(14)->addYear(),
            ],
            'draft' => [
                'status' => ContractStatus::DRAFT->value,
                'start_date' => now()->addMonth()->startOfMonth(),
                'end_date' => null,
            ],
            'terminated' => [
                'status' => ContractStatus::TERMINATED->value,
                'start_date' => now()->subMonthsNoOverflow(5)->startOfMonth(),
                'end_date' => now()->subMonthsNoOverflow(5)->startOfMonth()->addYear(),
                'terminated_by' => TerminatedBy::TENANT->value,
                'termination_reason' => 'Tenant relocated for work; lease ended by mutual agreement.',
            ],
            'expired' => [
                'status' => ContractStatus::EXPIRED->value,
                'start_date' => now()->subMonthsNoOverflow(13)->startOfMonth(),
                'end_date' => now()->subMonthsNoOverflow(1)->startOfMonth(),
            ],
            default => [
                'status' => ContractStatus::DRAFT->value,
                'start_date' => now()->addMonth()->startOfMonth(),
                'end_date' => null,
            ],
        };
    }
}
