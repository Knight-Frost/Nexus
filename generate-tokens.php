<?php
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Create or get users
$admin = \App\Models\User::where('email', 'phase6-admin@test.com')->first() 
    ?: \App\Models\User::factory()->create([
        'first_name' => 'Phase6',
        'last_name' => 'Admin',
        'email' => 'phase6-admin@test.com',
        'user_type' => 'tenant'
    ]);

$tenant = \App\Models\User::where('email', 'phase6-tenant@test.com')->first();
$landlord = \App\Models\User::where('email', 'phase6-landlord@test.com')->first();

// Generate tokens
$adminToken = $admin->createToken('phase6-admin')->plainTextToken;
$tenantToken = $tenant->createToken('phase6-tenant')->plainTextToken;
$landlordToken = $landlord->createToken('phase6-landlord')->plainTextToken;

// Display
echo "Admin: {$adminToken}\n";
echo "Tenant: {$tenantToken}\n";
echo "Landlord: {$landlordToken}\n";

// Save
file_put_contents('storage/logs/phase6/tokens.txt', "Admin: {$adminToken}\nTenant: {$tenantToken}\nLandlord: {$landlordToken}\n");

echo "\n✅ Tokens saved to storage/logs/phase6/tokens.txt\n";
