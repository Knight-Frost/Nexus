<?php

namespace Database\Seeders\Dev;

use App\Enums\AccountStatus;
use App\Enums\UserType;
use App\Enums\VerificationStatus;
use App\Models\Admin;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * UserSeeder — demo identities.
 *
 * Creates:
 *   - 1 super admin + 1 support admin (separate `admins` table)
 *   - 10 landlords (verified / pending / unverified / suspended variety)
 *   - 20 tenants  (verification + account-status variety, incl. suspended/blocked)
 *
 * Every account uses an @{test-domain} email and the shared demo password. Names
 * are fictional. Phone numbers use Ghana MTN-style prefixes; cities are real
 * Ghanaian locations to make the dashboard greeting/location truthful.
 */
class UserSeeder extends DevSeeder
{
    public function run(): void
    {
        $password = Hash::make($this->demoPassword());

        $this->seedAdmins($password);
        $this->seedRole(SeedCatalog::LANDLORDS, UserType::LANDLORD, $password);
        $this->seedRole(SeedCatalog::TENANTS, UserType::TENANT, $password);

        $this->command?->info(
            '  ✓ Users: 2 admins, '.count(SeedCatalog::LANDLORDS).' landlords, '
            .count(SeedCatalog::TENANTS).' tenants.'
        );
    }

    protected function seedAdmins(string $password): void
    {
        Admin::updateOrCreate(
            ['email' => 'admin@'.$this->domain()],
            ['name' => 'Wyncrest Super Admin', 'password' => $password, 'is_super_admin' => true, 'is_active' => true],
        );

        Admin::updateOrCreate(
            ['email' => 'support@'.$this->domain()],
            ['name' => 'Wyncrest Support', 'password' => $password, 'is_super_admin' => true, 'is_active' => true],
        );
    }

    /**
     * @param  array<int,array<string,mixed>>  $people
     */
    protected function seedRole(array $people, UserType $type, string $password): void
    {
        foreach ($people as $i => $person) {
            $verified = $person['verification'] === 'verified';

            User::updateOrCreate(
                ['email' => SeedCatalog::email($person['key'])],
                [
                    'user_type' => $type,
                    'password' => $password,
                    'first_name' => $person['first'],
                    'last_name' => $person['last'],
                    'phone' => $this->phone($type, $i),
                    'city' => $person['city'],
                    'email_verified_at' => now()->subDays(30 - ($i % 20)),
                    'identity_verified' => $verified,
                    'identity_verified_at' => $verified ? now()->subDays(20) : null,
                    'identity_verified_by' => $verified ? 'admin@'.$this->domain() : null,
                    'verification_status' => $this->verificationStatus($person['verification']),
                    'account_status' => $this->accountStatus($person['account']),
                    'is_active' => $person['account'] === 'active',
                    'suspended_at' => $person['account'] === 'suspended' ? now()->subDays(3) : null,
                    'suspension_reason' => $person['account'] === 'suspended'
                        ? 'Suspended pending document re-verification (demo).'
                        : null,
                ],
            );
        }
    }

    protected function phone(UserType $type, int $i): string
    {
        // Ghana mobile format: 024 (MTN) for tenants, 054 for landlords, then a
        // deterministic 7-digit body so numbers are stable and non-colliding.
        $prefix = $type === UserType::LANDLORD ? '054' : '024';

        return $prefix.str_pad((string) (1000000 + $i), 7, '0', STR_PAD_LEFT);
    }

    protected function verificationStatus(string $value): string
    {
        return match ($value) {
            'verified' => VerificationStatus::VERIFIED->value,
            'pending' => VerificationStatus::PENDING->value,
            'rejected' => VerificationStatus::REJECTED->value,
            'needs_more_information' => VerificationStatus::NEEDS_MORE_INFORMATION->value,
            default => VerificationStatus::UNVERIFIED->value,
        };
    }

    protected function accountStatus(string $value): string
    {
        return match ($value) {
            'suspended' => AccountStatus::SUSPENDED->value,
            'blocked' => AccountStatus::BLOCKED->value,
            'archived' => AccountStatus::ARCHIVED->value,
            default => AccountStatus::ACTIVE->value,
        };
    }
}
