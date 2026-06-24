<?php

/*
|--------------------------------------------------------------------------
| Seeding Configuration
|--------------------------------------------------------------------------
|
| Controls the two seeding modes:
|
|   - development : rich, realistic demo graph (tenants, landlords, properties,
|                   listings, applications, contracts, ledger, notifications,
|                   audit logs, …). Predictable local-only credentials.
|
|   - production  : safe baseline only — reference/system data (feature
|                   definitions) and an OPTIONAL super admin bootstrapped from
|                   environment variables. NEVER any demo people or money.
|
| Mode resolution (see Database\Seeders\DatabaseSeeder::resolveMode()):
|   1. NEXUS_SEED_MODE env, if set ('development' | 'production')
|   2. otherwise: production app environment => 'production', else 'development'
|
*/

return [
    // Explicit mode override. Leave null to auto-resolve from APP_ENV.
    'mode' => env('NEXUS_SEED_MODE'),

    // -------------------------------------------------------------------------
    // Development demo data
    // -------------------------------------------------------------------------
    'development' => [
        // Shared password for EVERY demo account. Local development ONLY — this is
        // intentionally printed to the console after seeding. Never used in prod.
        'password' => env('NEXUS_DEMO_PASSWORD', 'password'),

        // All demo emails use a reserved, non-routable test domain so they can
        // never collide with or email a real person.
        'email_domain' => env('NEXUS_DEMO_DOMAIN', 'wyncrest.test'),

        // Volume knobs — defaults satisfy the documented minimums.
        'tenants' => (int) env('NEXUS_DEMO_TENANTS', 20),
        'landlords' => (int) env('NEXUS_DEMO_LANDLORDS', 10),
    ],

    // -------------------------------------------------------------------------
    // Production super-admin bootstrap (OPTIONAL, env-driven)
    // -------------------------------------------------------------------------
    // If all three are present, ProductionSeeder firstOrCreate()s a single super
    // admin. If any are missing, it is SKIPPED with a logged warning — production
    // seeding never invents credentials.
    'bootstrap_admin' => [
        'email' => env('NEXUS_BOOTSTRAP_ADMIN_EMAIL'),
        'name' => env('NEXUS_BOOTSTRAP_ADMIN_NAME'),
        'password' => env('NEXUS_BOOTSTRAP_ADMIN_PASSWORD'),
    ],

    // Safety latch: refuse to run the heavy development seeder while APP_ENV is
    // production unless this is explicitly flipped on. Prevents an accidental
    // `NEXUS_SEED_MODE=development` from poisoning a production database.
    'allow_dev_seed_in_production' => (bool) env('NEXUS_ALLOW_DEV_SEED_IN_PROD', false),

    // Currency used for demo money (the platform presents GH₵).
    'currency' => env('NEXUS_DEMO_CURRENCY', 'GHS'),
];
