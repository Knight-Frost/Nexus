<?php

namespace Database\Seeders\Dev;

use App\Enums\ContractStatus;
use App\Enums\LedgerStatus;
use App\Enums\LedgerType;
use App\Models\Contract;
use App\Models\LedgerEntry;
use App\Services\LedgerService;

/**
 * LedgerSeeder — the immutable financial ledger.
 *
 * Builds a mathematically consistent ledger for every contract that has billing
 * history, exercising the real money paths:
 *   - rent charges          (LedgerService::generateFirstRentEntry / generateNextRentEntry)
 *   - payments              (PAYMENT entry with NEGATIVE amount_cents, mirroring PaymentService)
 *   - overdue               (transitionStatus → OVERDUE)
 *   - late fees             (LedgerService::generateLateFee)
 *   - partial payment       (PAYMENT < rent, obligation left unpaid)
 *
 * Immutability is honoured throughout: entries are created once and status is
 * only ever changed via transitionStatus(). Payments are stored as negative
 * amounts so PaymentService::getTenantBalance() (Σ obligations + Σ payments)
 * stays correct and derivable.
 *
 * Scenarios per active contract come from the catalog:
 *   - 'showcase' (tenant.showcase): paid history + overdue + late fee + partial + current pending
 *   - 'standard'                  : paid history + a single current pending month
 * Terminated / expired contracts get a short, fully-paid history.
 */
class LedgerSeeder extends DevSeeder
{
    protected LedgerService $ledger;

    public function run(): void
    {
        $this->ledger = app(LedgerService::class);
        $entriesBefore = LedgerEntry::count();

        foreach (SeedCatalog::UNITS as $u) {
            if (! $u['contract'] || ! $u['tenant']) {
                continue;
            }

            $unit = $this->unitFromCatalog($u);
            $contract = $unit ? Contract::where('listing_id', $this->listingForUnit($unit)?->id)->first() : null;
            if (! $contract) {
                continue;
            }

            match ($contract->status) {
                ContractStatus::ACTIVE => $this->seedActive($contract, (int) $u['months'], $u['ledger']),
                ContractStatus::TERMINATED => $this->seedClosedHistory($contract, 2),
                ContractStatus::EXPIRED => $this->seedClosedHistory($contract, 3),
                default => null, // draft / pending_tenant have no billing yet
            };
        }

        $total = LedgerEntry::count() - $entriesBefore;
        $this->command?->info("  ✓ Ledger: {$total} immutable entries (paid/overdue/late-fee/partial/pending).");
    }

    /**
     * Active lease: generate one rent entry per month from start to now, then
     * settle history and leave the latest month outstanding.
     */
    protected function seedActive(Contract $contract, int $months, string $scenario): void
    {
        $entries = $this->generateMonthlyRent($contract, $months);
        $last = count($entries) - 1;

        if ($scenario === 'showcase' && count($entries) >= 5) {
            // month0, month1 → paid; month2 → overdue + late fee; month3 → partial; latest → pending
            $this->settlePaid($entries[0]);
            $this->settlePaid($entries[1]);
            $this->makeOverdueWithLateFee($entries[2]);
            $this->makePartial($entries[3]);

            return;
        }

        // Standard: every month paid except the most recent (current obligation).
        foreach ($entries as $i => $entry) {
            if ($i !== $last) {
                $this->settlePaid($entry);
            }
        }
    }

    /** Terminated/expired lease: a short, fully-paid history. */
    protected function seedClosedHistory(Contract $contract, int $count): void
    {
        foreach ($this->generateMonthlyRent($contract, $count - 1) as $entry) {
            $this->settlePaid($entry);
        }
    }

    /**
     * Generate $months+1 sequential monthly rent entries via the real service.
     *
     * @return array<int,LedgerEntry>
     */
    protected function generateMonthlyRent(Contract $contract, int $months): array
    {
        $entries = [$this->ledger->generateFirstRentEntry($contract)];

        for ($i = 0; $i < $months; $i++) {
            $entries[] = $this->ledger->generateNextRentEntry($contract);
        }

        return $entries;
    }

    /** Record a full payment: negative PAYMENT entry + transition rent → PAID. */
    protected function settlePaid(LedgerEntry $rent): void
    {
        $paymentIntentId = $this->demoIntentId($rent);

        $this->recordPayment($rent, $rent->amount_cents, $paymentIntentId);
        $rent->transitionStatus(LedgerStatus::PAID, $paymentIntentId);
    }

    /** Mark a rent entry overdue and attach a 10% late fee via the service. */
    protected function makeOverdueWithLateFee(LedgerEntry $rent): void
    {
        $rent->transitionStatus(LedgerStatus::OVERDUE);
        $this->ledger->generateLateFee($rent, (int) round($rent->amount_cents * 0.10));
    }

    /** A partial payment: half the rent paid, the obligation left overdue. */
    protected function makePartial(LedgerEntry $rent): void
    {
        $rent->transitionStatus(LedgerStatus::OVERDUE);
        $this->recordPayment($rent, (int) round($rent->amount_cents / 2), $this->demoIntentId($rent));
        // Intentionally NOT transitioned to PAID — balance keeps the remainder.
    }

    /**
     * Create a PAYMENT ledger entry mirroring PaymentService::recordSuccessfulPayment:
     * negative amount_cents (money received), status PAID, linked to the obligation.
     */
    protected function recordPayment(LedgerEntry $rent, int $amountCents, string $paymentIntentId): void
    {
        LedgerEntry::create([
            'contract_id' => $rent->contract_id,
            'tenant_id' => $rent->tenant_id,
            'landlord_id' => $rent->landlord_id,
            'type' => LedgerType::PAYMENT,
            'amount_cents' => -abs($amountCents), // negative reduces the balance
            'currency' => $rent->currency,
            'billing_period_start' => $rent->billing_period_start,
            'billing_period_end' => $rent->billing_period_end,
            'due_date' => now(),
            'status' => LedgerStatus::PAID,
            'related_rent_entry_id' => $rent->id,
            'stripe_payment_intent_id' => $paymentIntentId,
        ]);
    }

    /** A clearly-fake, deterministic Stripe intent id (never a real charge). */
    protected function demoIntentId(LedgerEntry $rent): string
    {
        return 'pi_demo_seed_'.substr(str_replace('-', '', (string) $rent->id), 0, 16);
    }
}
