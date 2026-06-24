<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Support\Audit\AuditClassifier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    /**
     * All known actions — we bias severity based on the action.
     * Severity is derived from context for realism; it is never random for
     * high-impact actions.
     */
    private static array $actions = [
        'admin_login',
        'user_login',
        'login_rate_limited',
        'user_created',
        'email_verified',
        'identity_verified',
        'account_suspended',
        'account_reactivated',
        'tenant_profile_updated',
        'listing_created',
        'listing_updated',
        'listing_submitted',
        'listing_published',
        'listing_rejected',
        'listing_deleted',
        'property_created',
        'property_updated',
        'property_deleted',
        'unit_created',
        'unit_updated',
        'unit_deleted',
        'contract_created',
        'contract_sent',
        'contract_accepted',
        'contract_terminated',
        'contract_force_terminated',
        'payment_intent_created',
        'payment_intent_failed',
        'payment_recorded',
        'payment_failed',
        'rent_entry_created',
        'late_fee_applied',
        'entry_marked_overdue',
        'entry_paid',
        'entry_waived',
        'rent_entry_automated',
        'application_submitted',
        'application_withdrawn',
        'application_decided',
        'maintenance_request_created',
        'maintenance_request_cancelled',
        'maintenance_status_updated',
        'document_uploaded',
        'document_downloaded',
        'document_deleted',
        'feature_enabled',
        'feature_disabled',
    ];

    /**
     * Actions that should always be critical or warning severity.
     */
    private static array $criticalActions = [
        'login_rate_limited',
        'account_suspended',
        'contract_force_terminated',
        'payment_intent_failed',
        'payment_failed',
    ];

    private static array $warningActions = [
        'listing_rejected',
        'contract_terminated',
        'account_reactivated',
        'entry_marked_overdue',
        'late_fee_applied',
        'identity_verified',
    ];

    /**
     * Realistic user-agent strings — covers major OS/browser combos that
     * AuditClassifier::device() can parse.
     */
    private static array $userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    ];

    public function definition(): array
    {
        $action = fake()->randomElement(self::$actions);
        $severity = $this->deriveSeverity($action);
        $area = AuditClassifier::area($action);

        return [
            'actor_type' => null,
            'actor_id' => null,
            'subject_type' => null,
            'subject_id' => null,
            'action' => $action,
            'description' => $this->descriptionFor($action),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->randomElement(self::$userAgents),
            'old_values' => null,
            'new_values' => null,
            'metadata' => ['area' => $area],
            'severity' => $severity,
            // Spread created_at over the last 14 days, clustering today
            'created_at' => $this->realisticTimestamp(),
        ];
    }

    // -------------------------------------------------------------------------
    // State methods
    // -------------------------------------------------------------------------

    /** Force created_at to today */
    public function today(): static
    {
        return $this->state(fn () => [
            'created_at' => now()->subMinutes(fake()->numberBetween(0, 1439)),
        ]);
    }

    /** Force severity to critical */
    public function critical(): static
    {
        return $this->state(fn () => ['severity' => 'critical']);
    }

    /** Attach a specific actor model (Admin or User) */
    public function forActor(object $actor): static
    {
        return $this->state(fn () => [
            'actor_type' => get_class($actor),
            'actor_id' => $actor->id,
        ]);
    }

    /** Attach a specific subject model */
    public function aboutSubject(object $subject): static
    {
        return $this->state(fn () => [
            'subject_type' => get_class($subject),
            'subject_id' => $subject->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function deriveSeverity(string $action): string
    {
        if (in_array($action, self::$criticalActions)) {
            return 'critical';
        }
        if (in_array($action, self::$warningActions)) {
            return 'warning';
        }

        return 'info';
    }

    private function descriptionFor(string $action): string
    {
        return match ($action) {
            'admin_login' => 'Admin signed in to the platform.',
            'user_login' => 'User signed in.',
            'login_rate_limited' => 'Sign-in rate limit hit for this account.',
            'user_created' => 'New user account registered.',
            'email_verified' => 'User verified their email address.',
            'identity_verified' => 'User identity verified by admin.',
            'account_suspended' => 'User account suspended by admin.',
            'account_reactivated' => 'Suspended user account reactivated.',
            'tenant_profile_updated' => 'Tenant updated their profile.',
            'listing_created' => 'New listing created as draft.',
            'listing_updated' => 'Listing details updated.',
            'listing_submitted' => 'Listing submitted for moderation.',
            'listing_published' => 'Listing approved and published.',
            'listing_rejected' => 'Listing rejected during moderation.',
            'listing_deleted' => 'Listing removed from platform.',
            'property_created' => 'New property added.',
            'property_updated' => 'Property details updated.',
            'property_deleted' => 'Property removed.',
            'unit_created' => 'New unit added to property.',
            'unit_updated' => 'Unit details updated.',
            'unit_deleted' => 'Unit removed from property.',
            'contract_created' => 'New rental contract drafted.',
            'contract_sent' => 'Contract sent to tenant.',
            'contract_accepted' => 'Tenant accepted contract.',
            'contract_terminated' => 'Contract terminated.',
            'contract_force_terminated' => 'Contract force-terminated by admin.',
            'payment_intent_created' => 'Stripe payment intent created.',
            'payment_intent_failed' => 'Stripe payment intent failed.',
            'payment_recorded' => 'Rent payment recorded.',
            'payment_failed' => 'Payment attempt failed.',
            'rent_entry_created' => 'Rent ledger entry created.',
            'late_fee_applied' => 'Late fee applied to overdue entry.',
            'entry_marked_overdue' => 'Ledger entry marked overdue.',
            'entry_paid' => 'Ledger entry marked as paid.',
            'entry_waived' => 'Ledger entry waived by admin.',
            'rent_entry_automated' => 'Automated rent entry generated.',
            'application_submitted' => 'Rental application submitted.',
            'application_withdrawn' => 'Application withdrawn by tenant.',
            'application_decided' => 'Application decision made.',
            'maintenance_request_created' => 'New maintenance request submitted.',
            'maintenance_request_cancelled' => 'Maintenance request cancelled.',
            'maintenance_status_updated' => 'Maintenance request status updated.',
            'document_uploaded' => 'Document uploaded.',
            'document_downloaded' => 'Document downloaded.',
            'document_deleted' => 'Document deleted.',
            'feature_enabled' => 'Platform feature enabled for landlord.',
            'feature_disabled' => 'Platform feature disabled for landlord.',
            default => ucfirst(str_replace('_', ' ', $action)).'.',
        };
    }

    /**
     * Spread timestamps over 14 days, with ~40% of rows landing today.
     * This makes summary metrics and trend comparisons immediately useful
     * in a freshly seeded dev database.
     */
    private function realisticTimestamp(): \Carbon\Carbon
    {
        if (fake()->boolean(40)) {
            // Today — random minute during today
            return now()->startOfDay()->addMinutes(fake()->numberBetween(0, 1439));
        }

        // Spread over days 1–13 ago
        return now()->subDays(fake()->numberBetween(1, 13))
            ->startOfDay()
            ->addMinutes(fake()->numberBetween(0, 1439));
    }
}
