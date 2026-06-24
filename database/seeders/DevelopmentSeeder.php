<?php

namespace Database\Seeders;

use App\Models\Contract;
use App\Models\LedgerEntry;
use App\Models\Listing;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\Dev\ApplicationSeeder;
use Database\Seeders\Dev\AuditSeeder;
use Database\Seeders\Dev\ContractSeeder;
use Database\Seeders\Dev\EngagementSeeder;
use Database\Seeders\Dev\FeatureGateSeeder;
use Database\Seeders\Dev\LedgerSeeder;
use Database\Seeders\Dev\ListingSeeder;
use Database\Seeders\Dev\MaintenanceSeeder;
use Database\Seeders\Dev\NotificationSeeder;
use Database\Seeders\Dev\PropertySeeder;
use Database\Seeders\Dev\ReviewSeeder;
use Database\Seeders\Dev\SeedCatalog;
use Database\Seeders\Dev\UserSeeder;
use Database\Seeders\Dev\VerificationSeeder;
use Illuminate\Database\Seeder;

/**
 * DevelopmentSeeder — the rich, realistic demo graph.
 *
 * Builds the whole platform end-to-end so every dashboard, list and analytic is
 * meaningful immediately: users (20 tenants / 10 landlords / admins), properties,
 * 20 distinct units, listings across all statuses, applications, contracts across
 * the full lifecycle, an immutable & mathematically-consistent ledger (paid /
 * overdue / late fee / partial / pending), feature gates, verification records,
 * reviews, maintenance, multi-channel notifications and audit logs.
 *
 * All data is obviously demo (fictional names, @wyncrest.test emails, shared
 * password). Each focused sub-seeder owns one slice and reads its prerequisites
 * back from the database, so the pipeline stays modular and order-driven.
 */
class DevelopmentSeeder extends Seeder
{
    /**
     * Sub-seeders, in dependency order. Each is independently runnable but the
     * sequence guarantees prerequisites exist (users → properties → listings → …).
     */
    private const PIPELINE = [
        ReferenceDataSeeder::class,   // shared feature definitions
        UserSeeder::class,            // admins, 10 landlords, 20 tenants
        VerificationSeeder::class,    // identity verification requests + statuses
        FeatureGateSeeder::class,     // per-landlord feature access (full/limited/none)
        PropertySeeder::class,        // 10 properties + 20 distinct units
        ListingSeeder::class,         // listings across every status
        ApplicationSeeder::class,     // applications across every status
        ContractSeeder::class,        // contracts across the full lifecycle
        LedgerSeeder::class,          // immutable ledger: paid/overdue/late-fee/partial/pending
        MaintenanceSeeder::class,     // maintenance requests across statuses
        ReviewSeeder::class,          // reviews (pending/approved/rejected + responses)
        NotificationSeeder::class,    // in-app + email/SMS delivery states
        EngagementSeeder::class,      // saved listings, email logs, media metadata
        AuditSeeder::class,           // realistic audit-log activity
    ];

    public function run(): void
    {
        $this->guardAgainstProduction();

        foreach (self::PIPELINE as $seeder) {
            $this->call($seeder);
        }

        $this->printSummary();
    }

    /**
     * Refuse to run the heavy demo seeder against a production database unless
     * explicitly allowed. Prevents an accidental NEXUS_SEED_MODE=development from
     * poisoning production with fake people and money.
     */
    protected function guardAgainstProduction(): void
    {
        if (app()->environment('production') && ! config('seed.allow_dev_seed_in_production')) {
            throw new \RuntimeException(
                'Refusing to run DevelopmentSeeder in production. This creates fake demo data. '
                .'If you really intend this, set NEXUS_ALLOW_DEV_SEED_IN_PROD=true.'
            );
        }
    }

    /**
     * Print a concise demo-data summary + local-only login credentials.
     */
    protected function printSummary(): void
    {
        $out = $this->command?->getOutput();
        if (! $out) {
            return;
        }

        $password = config('seed.development.password');
        $domain = config('seed.development.email_domain');

        $counts = [
            ['Tenants', User::where('user_type', 'tenant')->count()],
            ['Landlords', User::where('user_type', 'landlord')->count()],
            ['Properties', Property::count()],
            ['Units', Unit::count()],
            ['Listings', Listing::count()],
            ['Contracts', Contract::count()],
            ['Ledger entries', LedgerEntry::count()],
        ];

        $out->writeln('');
        $out->writeln('  <info>═══════════════════════════════════════════════════════</info>');
        $out->writeln('  <info>  DEVELOPMENT SEED COMPLETE</info>');
        $out->writeln('  <info>═══════════════════════════════════════════════════════</info>');
        $this->command->table(['Entity', 'Count'], $counts);

        $out->writeln("  <comment>Demo logins</comment> — local development ONLY, password: <info>{$password}</info>");
        $out->writeln("    Super admin   admin@{$domain}");
        $out->writeln('    Landlord      '.SeedCatalog::email('landlord.verified').'   (verified, full features)');
        $out->writeln('    Landlord      '.SeedCatalog::email('landlord.limited').'    (limited features)');
        $out->writeln('    Landlord      '.SeedCatalog::email('landlord.pending').'    (verification pending)');
        $out->writeln('    Tenant        '.SeedCatalog::email('tenant.showcase').'    (active lease, overdue + late fee + partial)');
        $out->writeln('    Tenant        '.SeedCatalog::email('tenant.active').'      (active lease, up to date)');
        $out->writeln('  <comment>Note:</comment> tenant.suspended / tenant.blocked & landlord.suspended demonstrate account governance (login refused).');
        $out->writeln('  Verify the graph: <info>php artisan nexus:seed:verify</info>');
        $out->writeln('');
    }
}
