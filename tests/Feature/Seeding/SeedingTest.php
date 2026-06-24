<?php

namespace Tests\Feature\Seeding;

use App\Enums\ContractStatus;
use App\Enums\LedgerStatus;
use App\Enums\LedgerType;
use App\Enums\ListingStatus;
use App\Enums\UserType;
use App\Models\Admin;
use App\Models\Contract;
use App\Models\Feature;
use App\Models\LedgerEntry;
use App\Models\Listing;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use App\Services\PaymentService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Dev\SeedCatalog;
use Database\Seeders\DevelopmentSeeder;
use Database\Seeders\ProductionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers the development/production seeding system: production safety &
 * idempotency, mode resolution, and the integrity of the development graph
 * (counts, lifecycle coverage, and a mathematically-consistent ledger).
 */
class SeedingTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_seeder_creates_only_reference_data_and_no_demo_data(): void
    {
        $this->seed(ProductionSeeder::class);

        $this->assertSame(count(SeedCatalog::FEATURES), Feature::count());

        // Crucially: production NEVER fabricates people, money, or inventory.
        $this->assertSame(0, User::count());
        $this->assertSame(0, Admin::count());
        $this->assertSame(0, Property::count());
        $this->assertSame(0, Contract::count());
        $this->assertSame(0, LedgerEntry::count());
    }

    public function test_production_seeder_is_idempotent(): void
    {
        $this->seed(ProductionSeeder::class);
        $this->seed(ProductionSeeder::class);

        // Re-running must not duplicate reference rows.
        $this->assertSame(count(SeedCatalog::FEATURES), Feature::count());
    }

    public function test_production_bootstrap_admin_is_created_only_from_config(): void
    {
        config([
            'seed.bootstrap_admin.email' => 'ops@example.com',
            'seed.bootstrap_admin.name' => 'Ops Admin',
            'seed.bootstrap_admin.password' => 'secret-password',
        ]);

        $this->seed(ProductionSeeder::class);
        $this->seed(ProductionSeeder::class); // idempotent

        $this->assertSame(1, Admin::where('email', 'ops@example.com')->count());
        $this->assertTrue(Admin::where('email', 'ops@example.com')->first()->is_super_admin);
    }

    public function test_mode_resolution_prefers_explicit_config(): void
    {
        config(['seed.mode' => 'production']);
        $this->assertSame('production', DatabaseSeeder::resolveMode());

        config(['seed.mode' => 'development']);
        $this->assertSame('development', DatabaseSeeder::resolveMode());

        // No explicit mode + non-production env => development.
        config(['seed.mode' => null]);
        $this->assertSame('development', DatabaseSeeder::resolveMode());
    }

    public function test_development_seeder_refuses_to_run_in_production(): void
    {
        $this->app['env'] = 'production';
        config(['seed.allow_dev_seed_in_production' => false]);

        // Invoke the seeder directly so the safety guard's exception surfaces
        // (the artisan db:seed path mocks console output and would mask it).
        $seeder = $this->app->make(DevelopmentSeeder::class);

        try {
            $this->expectException(\RuntimeException::class);
            $seeder->run();
        } finally {
            $this->app['env'] = 'testing';
        }
    }

    public function test_development_graph_is_complete_and_ledger_is_consistent(): void
    {
        $this->seed(DevelopmentSeeder::class);

        // Documented minimums.
        $this->assertSame(20, User::where('user_type', UserType::TENANT->value)->count());
        $this->assertSame(10, User::where('user_type', UserType::LANDLORD->value)->count());
        $this->assertSame(20, Unit::count());
        $this->assertSame(10, Property::count());

        // 20 distinct unit types (no clones).
        $this->assertSame(20, Unit::query()->distinct()->count('internal_name'));

        // Every listing + contract lifecycle status is represented.
        foreach (ListingStatus::cases() as $status) {
            $this->assertTrue(
                Listing::where('status', $status->value)->exists(),
                "Expected a listing in status {$status->value}",
            );
        }
        foreach (ContractStatus::cases() as $status) {
            $this->assertTrue(
                Contract::where('status', $status->value)->exists(),
                "Expected a contract in status {$status->value}",
            );
        }

        $this->assertLedgerIsConsistent();
        $this->assertShowcaseLedgerScenario();
    }

    /** Payments are negative & linked; obligations positive; balances derivable. */
    protected function assertLedgerIsConsistent(): void
    {
        $this->assertSame(
            0,
            LedgerEntry::where('type', LedgerType::PAYMENT->value)
                ->where(fn ($q) => $q->where('amount_cents', '>=', 0)->orWhereNull('related_rent_entry_id'))
                ->count(),
            'All PAYMENT entries must be negative and linked to an obligation.',
        );

        $this->assertSame(
            0,
            LedgerEntry::whereIn('type', [LedgerType::RENT->value, LedgerType::LATE_FEE->value])
                ->where('amount_cents', '<=', 0)->count(),
            'All obligations must be positive.',
        );

        $payments = app(PaymentService::class);
        foreach (User::where('user_type', UserType::TENANT->value)->get() as $tenant) {
            $obligations = LedgerEntry::byTenant($tenant->id)
                ->whereIn('type', [LedgerType::RENT->value, LedgerType::LATE_FEE->value])->sum('amount_cents');
            $paid = LedgerEntry::byTenant($tenant->id)->where('type', LedgerType::PAYMENT->value)->sum('amount_cents');

            $this->assertSame(
                $obligations + $paid,
                $payments->getTenantBalance($tenant),
                "Balance for tenant {$tenant->id} must be derivable from the ledger.",
            );
        }
    }

    /** The showcase tenant must exhibit overdue + late fee + partial, summing to a known balance. */
    protected function assertShowcaseLedgerScenario(): void
    {
        $showcase = User::where('email', SeedCatalog::email('tenant.showcase'))->first();
        $this->assertNotNull($showcase);

        $this->assertTrue(
            LedgerEntry::byTenant($showcase->id)->where('status', LedgerStatus::OVERDUE->value)->exists(),
        );
        $this->assertTrue(
            LedgerEntry::byTenant($showcase->id)->where('type', LedgerType::LATE_FEE->value)->exists(),
        );

        // Rent GH₵1,800 (=180000 cents): m0,m1 paid; m2 overdue + 10% fee; m3 overdue w/ half paid; m4 pending.
        // Balance = 180000(m2) + 18000(fee) + 90000(m3 remainder) + 180000(m4) = 468000.
        $this->assertSame(468000, app(PaymentService::class)->getTenantBalance($showcase));
    }
}
