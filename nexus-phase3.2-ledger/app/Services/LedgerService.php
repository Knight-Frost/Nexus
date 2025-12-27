<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\LedgerEntry;
use App\Enums\LedgerType;
use App\Enums\LedgerStatus;
use Carbon\Carbon;

/**
 * LedgerService
 * 
 * Handles ledger entry creation and financial calculations.
 * All money amounts in cents.
 */
class LedgerService
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    /**
     * Generate first rent ledger entry when contract becomes active
     * 
     * @param Contract $contract
     * @return LedgerEntry
     */
    public function generateFirstRentEntry(Contract $contract): LedgerEntry
    {
        // Calculate billing period (monthly)
        $billingStart = Carbon::parse($contract->start_date);
        $billingEnd = $billingStart->copy()->addMonth()->subDay();
        
        // Due date is based on payment_day of the month
        $dueDate = $billingStart->copy()->day($contract->payment_day);
        
        // If due date is before billing start, push to next month
        if ($dueDate->lt($billingStart)) {
            $dueDate->addMonth();
        }

        $entry = LedgerEntry::create([
            'contract_id' => $contract->id,
            'tenant_id' => $contract->tenant_id,
            'landlord_id' => $contract->landlord_id,
            'type' => LedgerType::RENT,
            'amount_cents' => $contract->rent_amount,
            'currency' => $contract->currency,
            'billing_period_start' => $billingStart,
            'billing_period_end' => $billingEnd,
            'due_date' => $dueDate,
            'status' => LedgerStatus::PENDING,
        ]);

        // Audit log
        $this->auditService->log(
            actor: null, // System-generated
            action: 'rent_entry_created',
            subject: $entry,
            description: "Rent entry created for contract {$contract->id}: {$billingStart->format('M Y')}",
            severity: 'info'
        );

        return $entry;
    }

    /**
     * Generate next rent entry for a contract
     * 
     * @param Contract $contract
     * @return LedgerEntry
     */
    public function generateNextRentEntry(Contract $contract): LedgerEntry
    {
        // Find the last rent entry
        $lastEntry = LedgerEntry::where('contract_id', $contract->id)
            ->where('type', LedgerType::RENT)
            ->orderBy('billing_period_end', 'desc')
            ->first();

        if (!$lastEntry) {
            return $this->generateFirstRentEntry($contract);
        }

        // Next billing period starts the day after the last one ended
        $billingStart = $lastEntry->billing_period_end->copy()->addDay();
        $billingEnd = $billingStart->copy()->addMonth()->subDay();
        
        // Due date
        $dueDate = $billingStart->copy()->day($contract->payment_day);
        if ($dueDate->lt($billingStart)) {
            $dueDate->addMonth();
        }

        $entry = LedgerEntry::create([
            'contract_id' => $contract->id,
            'tenant_id' => $contract->tenant_id,
            'landlord_id' => $contract->landlord_id,
            'type' => LedgerType::RENT,
            'amount_cents' => $contract->rent_amount,
            'currency' => $contract->currency,
            'billing_period_start' => $billingStart,
            'billing_period_end' => $billingEnd,
            'due_date' => $dueDate,
            'status' => LedgerStatus::PENDING,
        ]);

        // Audit log
        $this->auditService->log(
            actor: null,
            action: 'rent_entry_created',
            subject: $entry,
            description: "Rent entry created for contract {$contract->id}: {$billingStart->format('M Y')}",
            severity: 'info'
        );

        return $entry;
    }

    /**
     * Generate late fee for an overdue rent entry
     * 
     * @param LedgerEntry $rentEntry
     * @param int $lateFeeAmountCents
     * @return LedgerEntry
     */
    public function generateLateFee(LedgerEntry $rentEntry, int $lateFeeAmountCents): LedgerEntry
    {
        if (!$rentEntry->type->isRent()) {
            throw new \Exception('Late fees can only be applied to rent entries');
        }

        if (!$rentEntry->isOverdue()) {
            throw new \Exception('Late fees can only be applied to overdue entries');
        }

        // Check if late fee already exists for this rent entry
        $existingLateFee = LedgerEntry::where('related_rent_entry_id', $rentEntry->id)
            ->where('type', LedgerType::LATE_FEE)
            ->first();

        if ($existingLateFee) {
            throw new \Exception('Late fee already exists for this rent entry');
        }

        $lateFeeEntry = LedgerEntry::create([
            'contract_id' => $rentEntry->contract_id,
            'tenant_id' => $rentEntry->tenant_id,
            'landlord_id' => $rentEntry->landlord_id,
            'type' => LedgerType::LATE_FEE,
            'amount_cents' => $lateFeeAmountCents,
            'currency' => $rentEntry->currency,
            'billing_period_start' => $rentEntry->billing_period_start,
            'billing_period_end' => $rentEntry->billing_period_end,
            'due_date' => now(), // Late fee is due immediately
            'status' => LedgerStatus::PENDING,
            'related_rent_entry_id' => $rentEntry->id,
        ]);

        // Audit log (warning severity - financial penalty)
        $this->auditService->log(
            actor: null,
            action: 'late_fee_applied',
            subject: $lateFeeEntry,
            description: "Late fee applied to rent entry {$rentEntry->id}: \${$lateFeeAmountCents / 100}",
            severity: 'warning'
        );

        return $lateFeeEntry;
    }

    /**
     * Mark entries as overdue
     * (Future: this will be called by cron job)
     * 
     * @return int Number of entries marked overdue
     */
    public function markOverdueEntries(): int
    {
        $entries = LedgerEntry::where('status', LedgerStatus::PENDING)
            ->where('due_date', '<', now())
            ->get();

        $count = 0;
        foreach ($entries as $entry) {
            // Override immutability for status updates only
            $entry->status = LedgerStatus::OVERDUE;
            $entry->saveQuietly(); // Bypass immutability check
            $count++;
        }

        return $count;
    }
}
