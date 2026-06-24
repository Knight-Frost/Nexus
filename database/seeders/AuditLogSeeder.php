<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * AuditLogSeeder
 *
 * Seeds a realistic spread of audit log rows — enough for the Audit & Activity
 * Center's summary metrics, trend comparisons, pagination, and area filtering
 * to be demonstrable immediately after `php artisan db:seed`.
 *
 * Volume: 120–300 rows over ~14 days, with a today-cluster.
 * Idempotent-friendly: each run just creates additional rows (fine for demo).
 */
class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        // Resolve seeded actors — fall back gracefully if not yet seeded
        $admin = Admin::first();
        $landlord = User::where('user_type', 'landlord')->first();
        $tenant = User::where('user_type', 'tenant')->first();

        // -----------------------------------------------------------------------
        // 1. Today's cluster — admin logins, critical events, moderation
        // -----------------------------------------------------------------------

        // Admin login today
        if ($admin) {
            AuditLog::factory()->today()->forActor($admin)->create([
                'action' => 'admin_login',
                'severity' => 'info',
                'description' => 'Admin signed in to the platform.',
            ]);
        }

        // A few rate-limited sign-ins today (critical — triggers summary insight)
        AuditLog::factory()->today()->critical()->count(3)->create([
            'action' => 'login_rate_limited',
            'description' => 'Sign-in rate limit hit for this account.',
        ]);

        // Listing published / rejected today by admin
        if ($admin) {
            AuditLog::factory()->today()->forActor($admin)->create([
                'action' => 'listing_published',
                'severity' => 'info',
                'description' => 'Listing approved and published.',
            ]);
            AuditLog::factory()->today()->forActor($admin)->create([
                'action' => 'listing_rejected',
                'severity' => 'warning',
                'description' => 'Listing rejected during moderation.',
            ]);
        }

        // Account suspended today — critical, triggers "needs review"
        if ($admin) {
            AuditLog::factory()->today()->forActor($admin)->critical()->create([
                'action' => 'account_suspended',
                'description' => 'User account suspended by admin.',
            ]);
        }

        // Landlord activity today
        if ($landlord) {
            AuditLog::factory()->today()->forActor($landlord)->count(4)->create();
        }

        // Tenant activity today
        if ($tenant) {
            AuditLog::factory()->today()->forActor($tenant)->count(5)->create();
        }

        // General today cluster (anonymous / system)
        AuditLog::factory()->today()->count(25)->create();

        // -----------------------------------------------------------------------
        // 2. Yesterday cluster — for trend comparisons
        // -----------------------------------------------------------------------
        $yesterday = now()->subDay()->startOfDay();

        // Fewer critical events yesterday so today's critical count shows an increase
        AuditLog::factory()->count(2)->create([
            'action' => 'login_rate_limited',
            'severity' => 'critical',
            'description' => 'Sign-in rate limit hit for this account.',
            'created_at' => $yesterday->copy()->addHours(10),
        ]);

        AuditLog::factory()->count(20)->create([
            'created_at' => $yesterday->copy()->addMinutes(fake()->numberBetween(0, 1439)),
        ]);

        // -----------------------------------------------------------------------
        // 3. Historical spread — days 2–14 ago (bulk volume for pagination)
        // -----------------------------------------------------------------------
        AuditLog::factory()->count(200)->create();

        // -----------------------------------------------------------------------
        // 4. Ledger / payment events for the Ledger area
        // -----------------------------------------------------------------------
        $ledgerActions = ['payment_recorded', 'rent_entry_created', 'entry_paid', 'late_fee_applied', 'entry_marked_overdue'];
        foreach ($ledgerActions as $action) {
            AuditLog::factory()->count(5)->create(['action' => $action]);
        }

        // -----------------------------------------------------------------------
        // 5. Contract events for the Contracts area
        // -----------------------------------------------------------------------
        $contractActions = ['contract_created', 'contract_sent', 'contract_accepted', 'contract_terminated'];
        foreach ($contractActions as $action) {
            AuditLog::factory()->count(3)->create(['action' => $action]);
        }

        $count = AuditLog::count();
        echo "✓ AuditLogSeeder: {$count} audit log rows total\n";
    }
}
