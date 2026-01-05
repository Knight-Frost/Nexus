<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Enums\UserType;
use Illuminate\Support\Facades\DB;

// Force delete old test users (including soft deletes)
DB::table('users')->whereIn('email', [
    'phase6-admin@test.com',
    'phase6-admin2@test.com', 
    'phase6-tenant@test.com',
    'phase6-landlord@test.com'
])->delete();

// Also delete their tokens
DB::table('personal_access_tokens')->whereIn('name', [
    'phase6-admin',
    'phase6-tenant',
    'phase6-landlord'
])->delete();

// Create proper users
$admin = User::create([
    'email' => 'phase6-admin@test.com',
    'password' => bcrypt('password'),
    'first_name' => 'Phase6',
    'last_name' => 'Admin',
    'user_type' => UserType::LANDLORD,
    'email_verified_at' => now(),
]);

$tenant = User::create([
    'email' => 'phase6-tenant@test.com',
    'password' => bcrypt('password'),
    'first_name' => 'Phase6',
    'last_name' => 'Tenant',
    'user_type' => UserType::TENANT,
    'email_verified_at' => now(),
]);

$landlord = User::create([
    'email' => 'phase6-landlord@test.com',
    'password' => bcrypt('password'),
    'first_name' => 'Phase6',
    'last_name' => 'Landlord',
    'user_type' => UserType::LANDLORD,
    'email_verified_at' => now(),
]);

// Generate tokens
$adminToken = $admin->createToken('phase6-admin')->plainTextToken;
$tenantToken = $tenant->createToken('phase6-tenant')->plainTextToken;
$landlordToken = $landlord->createToken('phase6-landlord')->plainTextToken;

echo "✅ Users created!\n\n";
echo "Admin (landlord): {$adminToken}\n";
echo "Tenant: {$tenantToken}\n";
echo "Landlord: {$landlordToken}\n\n";

file_put_contents('storage/logs/phase6/tokens.txt', "Admin: {$adminToken}\nTenant: {$tenantToken}\nLandlord: {$landlordToken}\n");
echo "✅ Tokens saved to storage/logs/phase6/tokens.txt\n";
