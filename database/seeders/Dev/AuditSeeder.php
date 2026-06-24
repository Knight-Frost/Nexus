<?php

namespace Database\Seeders\Dev;

use App\Models\AuditLog;
use App\Models\Contract;
use App\Models\Listing;

/**
 * AuditSeeder — realistic append-only audit activity.
 *
 * The financial actions already self-audited while LedgerSeeder ran (rent
 * created, paid, overdue, late fee). This seeder adds the surrounding platform
 * activity — admin logins, moderation, account, contract and feature events,
 * a today/yesterday cluster for trend metrics, and bulk history for pagination —
 * tying entries to real seeded actors and subjects where it makes sense.
 */
class AuditSeeder extends DevSeeder
{
    public function run(): void
    {
        $admin = $this->superAdmin();
        $before = AuditLog::count();

        $this->seedTodayCluster($admin);
        $this->seedModerationAndContracts($admin);
        $this->seedHistory();

        $added = AuditLog::count() - $before;
        $total = AuditLog::count();
        $this->command?->info("  ✓ Audit: +{$added} activity rows ({$total} total incl. ledger self-audits).");
    }

    protected function seedTodayCluster(?object $admin): void
    {
        if ($admin) {
            AuditLog::factory()->today()->forActor($admin)->create([
                'action' => 'admin_login',
                'severity' => 'info',
                'description' => 'Admin signed in to the platform.',
            ]);
        }

        // Rate-limited sign-ins today (critical → drives the summary insight).
        AuditLog::factory()->today()->critical()->count(3)->create([
            'action' => 'login_rate_limited',
            'description' => 'Sign-in rate limit hit for this account.',
        ]);

        // A real landlord + tenant active today.
        foreach (['landlord.verified', 'tenant.active'] as $key) {
            if ($user = $this->user($key)) {
                AuditLog::factory()->today()->forActor($user)->count(4)->create();
            }
        }

        // Fewer criticals yesterday so today shows an upward trend.
        AuditLog::factory()->count(2)->create([
            'action' => 'login_rate_limited',
            'severity' => 'critical',
            'description' => 'Sign-in rate limit hit for this account.',
            'created_at' => now()->subDay()->startOfDay()->addHours(10),
        ]);
    }

    protected function seedModerationAndContracts(?object $admin): void
    {
        // Moderation tied to real listings.
        $listings = Listing::orderBy('id')->limit(4)->get();
        foreach ($listings as $i => $listing) {
            $approved = $i % 2 === 0;
            $factory = AuditLog::factory()->aboutSubject($listing);
            if ($admin) {
                $factory = $factory->forActor($admin);
            }
            $factory->create([
                'action' => $approved ? 'listing_published' : 'listing_rejected',
                'severity' => $approved ? 'info' : 'warning',
                'description' => $approved ? 'Listing approved and published.' : 'Listing rejected during moderation.',
            ]);
        }

        // Account governance (suspend/block) tied to the governed demo users.
        if ($admin) {
            foreach (['tenant.suspended' => 'account_suspended', 'tenant.blocked' => 'account_blocked'] as $key => $action) {
                if ($user = $this->user($key)) {
                    AuditLog::factory()->forActor($admin)->aboutSubject($user)->critical()->create([
                        'action' => $action,
                        'description' => 'Account '.($action === 'account_blocked' ? 'blocked' : 'suspended').' by admin.',
                    ]);
                }
            }
        }

        // Contract lifecycle tied to real contracts.
        $contracts = Contract::orderBy('created_at')->limit(5)->get();
        foreach ($contracts as $contract) {
            AuditLog::factory()->aboutSubject($contract)->create([
                'action' => 'contract_accepted',
                'severity' => 'info',
                'description' => 'Tenant accepted contract.',
            ]);
        }

        // Feature grants tied to real landlords.
        if ($admin) {
            foreach (['landlord.verified', 'landlord.estate', 'landlord.limited'] as $key) {
                if ($landlord = $this->user($key)) {
                    AuditLog::factory()->forActor($admin)->aboutSubject($landlord)->create([
                        'action' => 'feature_enabled',
                        'severity' => 'info',
                        'description' => 'Platform feature enabled for landlord.',
                    ]);
                }
            }
        }
    }

    protected function seedHistory(): void
    {
        // Bulk historical spread (days 1–13 ago) for pagination + area filtering.
        AuditLog::factory()->count(150)->create();
    }
}
