<?php

namespace App\Console\Commands;

use App\Enums\ContractStatus;
use App\Enums\LedgerStatus;
use App\Enums\LedgerType;
use App\Enums\ListingStatus;
use App\Enums\UserType;
use App\Models\Application;
use App\Models\Contract;
use App\Models\Feature;
use App\Models\LedgerEntry;
use App\Models\Listing;
use App\Models\Notification;
use App\Models\Property;
use App\Models\Review;
use App\Models\Unit;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Services\PaymentService;
use Database\Seeders\Dev\SeedCatalog;
use Illuminate\Console\Command;

/**
 * nexus:seed:verify
 *
 * Verifies the development seed graph: counts hit the documented minimums, every
 * lifecycle status is represented, and — most importantly — the immutable ledger
 * is mathematically consistent (balances are derivable and truthful).
 *
 * Exits non-zero if any check fails, so it doubles as a CI smoke check.
 */
class SeedVerifyCommand extends Command
{
    protected $signature = 'nexus:seed:verify';

    protected $description = 'Verify the development seed graph and ledger consistency';

    /** @var array<int,array{0:string,1:string|int,2:string|int,3:bool}> */
    protected array $rows = [];

    public function handle(): int
    {
        $this->checkCounts();
        $this->checkStatusCoverage();
        $this->checkLedgerConsistency();

        $this->table(['Check', 'Expected', 'Actual', 'OK'], array_map(
            fn ($r) => [$r[0], (string) $r[1], (string) $r[2], $r[3] ? '<info>✓</info>' : '<error>✗</error>'],
            $this->rows,
        ));

        $failed = collect($this->rows)->reject(fn ($r) => $r[3])->count();

        if ($failed > 0) {
            $this->error("Seed verification FAILED: {$failed} check(s) did not pass.");

            return self::FAILURE;
        }

        $this->info('Seed verification passed — the demo graph is complete and the ledger is consistent.');

        return self::SUCCESS;
    }

    protected function assert(string $label, $expected, $actual, ?bool $ok = null): void
    {
        $this->rows[] = [$label, $expected, $actual, $ok ?? ($expected === $actual)];
    }

    protected function checkCounts(): void
    {
        $this->assert('Tenants', config('seed.development.tenants', 20), User::where('user_type', UserType::TENANT->value)->count());
        $this->assert('Landlords', config('seed.development.landlords', 10), User::where('user_type', UserType::LANDLORD->value)->count());
        $this->assert('Properties', count(SeedCatalog::PROPERTIES), Property::count());
        $this->assert('Units', count(SeedCatalog::UNITS), Unit::count());

        // All 20 units are DISTINCT types (internal_name carries the type label).
        $distinctTypes = Unit::query()->distinct()->count('internal_name');
        $this->assert('Distinct unit types', count(SeedCatalog::UNITS), $distinctTypes);

        $this->assert('Listings', count(SeedCatalog::UNITS), Listing::count());
        $this->assert('Features', count(SeedCatalog::FEATURES), Feature::count());

        $this->assert('Applications (>0)', '>0', Application::count(), Application::count() > 0);
        $this->assert('Contracts (>0)', '>0', Contract::count(), Contract::count() > 0);
        $this->assert('Ledger entries (>0)', '>0', LedgerEntry::count(), LedgerEntry::count() > 0);
        $this->assert('Notifications (>0)', '>0', Notification::count(), Notification::count() > 0);
        $this->assert('Verification requests (>0)', '>0', VerificationRequest::count(), VerificationRequest::count() > 0);
        $this->assert('Reviews (>0)', '>0', Review::count(), Review::count() > 0);
    }

    protected function checkStatusCoverage(): void
    {
        // Every listing status present.
        foreach (ListingStatus::cases() as $status) {
            $has = Listing::where('status', $status->value)->exists();
            $this->assert("Listing status: {$status->value}", 'present', $has ? 'present' : 'missing', $has);
        }

        // Every contract lifecycle present.
        foreach (ContractStatus::cases() as $status) {
            $has = Contract::where('status', $status->value)->exists();
            $this->assert("Contract status: {$status->value}", 'present', $has ? 'present' : 'missing', $has);
        }

        // Notification read + delivery variety.
        $this->assert('Unread notifications', '>0', Notification::whereNull('read_at')->count(), Notification::whereNull('read_at')->exists());
        $this->assert('Read notifications', '>0', Notification::whereNotNull('read_at')->count(), Notification::whereNotNull('read_at')->exists());
        $this->assert('Failed email deliveries', '>0', Notification::whereNotNull('delivery_failed_at')->count(), Notification::whereNotNull('delivery_failed_at')->exists());
    }

    protected function checkLedgerConsistency(): void
    {
        $payments = app(PaymentService::class);

        // 1. Every PAYMENT entry is negative and linked to an obligation.
        $badPayments = LedgerEntry::where('type', LedgerType::PAYMENT->value)
            ->where(fn ($q) => $q->where('amount_cents', '>=', 0)->orWhereNull('related_rent_entry_id'))
            ->count();
        $this->assert('Payments negative & linked', 0, $badPayments);

        // 2. Every obligation (rent/late_fee) is a positive amount.
        $badObligations = LedgerEntry::whereIn('type', [LedgerType::RENT->value, LedgerType::LATE_FEE->value])
            ->where('amount_cents', '<=', 0)->count();
        $this->assert('Obligations positive', 0, $badObligations);

        // 3. Per-tenant balance is derivable and matches PaymentService.
        $mismatch = 0;
        foreach (User::where('user_type', UserType::TENANT->value)->get() as $tenant) {
            $obligations = LedgerEntry::byTenant($tenant->id)
                ->whereIn('type', [LedgerType::RENT->value, LedgerType::LATE_FEE->value])->sum('amount_cents');
            $paid = LedgerEntry::byTenant($tenant->id)->where('type', LedgerType::PAYMENT->value)->sum('amount_cents');
            if (($obligations + $paid) !== $payments->getTenantBalance($tenant)) {
                $mismatch++;
            }
        }
        $this->assert('Tenant balances derivable', 0, $mismatch);

        // 4. Showcase tenant exhibits overdue + late fee + a positive balance.
        $showcase = User::where('email', SeedCatalog::email('tenant.showcase'))->first();
        if ($showcase) {
            $hasOverdue = LedgerEntry::byTenant($showcase->id)->where('status', LedgerStatus::OVERDUE->value)->exists();
            $hasLateFee = LedgerEntry::byTenant($showcase->id)->where('type', LedgerType::LATE_FEE->value)->exists();
            $balance = $payments->getTenantBalance($showcase);
            $this->assert('Showcase has overdue entry', 'yes', $hasOverdue ? 'yes' : 'no', $hasOverdue);
            $this->assert('Showcase has late fee', 'yes', $hasLateFee ? 'yes' : 'no', $hasLateFee);
            $this->assert('Showcase balance owed', '>0', $balance, $balance > 0);
        }

        // 5. At least one active contract is fully settled to date (a paid history exists).
        $anyPaid = LedgerEntry::where('type', LedgerType::RENT->value)
            ->where('status', LedgerStatus::PAID->value)->exists();
        $this->assert('Paid rent history exists', 'yes', $anyPaid ? 'yes' : 'no', $anyPaid);
    }
}
