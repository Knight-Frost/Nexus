<?php

namespace Database\Seeders\Dev;

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\User;

/**
 * NotificationSeeder — in-app notifications across types, read state and channels.
 *
 * Covers the matrix the notifications UI and delivery analytics need:
 *   read state     : unread / read
 *   email delivery : delivered / failed / pending
 *   sms delivery   : delivered / failed
 *
 * The base row is created through the real Notification model; the delivery/read
 * columns are guarded (not mass-assignable), so they're applied with forceFill +
 * saveQuietly to avoid firing redundant cache-invalidation on every write.
 */
class NotificationSeeder extends DevSeeder
{
    public function run(): void
    {
        $created = 0;
        $created += $this->seedTenantNotifications();
        $created += $this->seedLandlordNotifications();

        $this->command?->info("  ✓ Notifications: {$created} across types + read/unread + email/SMS delivery states.");
    }

    protected function seedTenantNotifications(): int
    {
        $cur = $this->currencySymbol();

        $specs = [
            ['tenant.showcase', NotificationType::RENT_OVERDUE, 'Rent overdue', "Your rent of {$cur}1,800 is overdue. Please pay to avoid further late fees.", 'unread_delivered'],
            ['tenant.showcase', NotificationType::LATE_FEE_ADDED, 'Late fee added', "A late fee of {$cur}180 was added to your account.", 'unread_failed'],
            ['tenant.showcase', NotificationType::RENT_GENERATED, 'New rent charge', "Your rent for this month ({$cur}1,800) has been generated.", 'read_delivered'],
            ['tenant.active', NotificationType::PAYMENT_SUCCEEDED, 'Payment received', "We received your rent payment of {$cur}4,500. Thank you!", 'read_delivered'],
            ['tenant.active', NotificationType::RENT_DUE_SOON, 'Rent due soon', "Your next rent payment of {$cur}4,500 is due in 3 days.", 'unread_sms'],
            ['tenant.current', NotificationType::PAYMENT_SUCCEEDED, 'Payment received', "We received your rent payment of {$cur}9,000.", 'read_delivered'],
            ['tenant.new', NotificationType::CONTRACT_SIGNED, 'Lease activated', 'Your lease is now active. Welcome to your new home!', 'unread_delivered'],
            ['tenant.luxury', NotificationType::VERIFICATION_APPROVED, 'Identity verified', 'Your identity has been verified. You now have full access.', 'read_delivered'],
            ['tenant.pending', NotificationType::VERIFICATION_SUBMITTED, 'Verification submitted', 'Your verification documents are under review.', 'pending'],
            ['tenant.applicant', NotificationType::APPLICATION_REJECTED, 'Application update', 'Your application was not successful this time.', 'unread_delivered'],
            ['tenant.former', NotificationType::CONTRACT_TERMINATED, 'Lease ended', 'Your lease has been terminated as agreed. We wish you well.', 'read_sms_failed'],
        ];

        return $this->createFromSpecs($specs);
    }

    protected function seedLandlordNotifications(): int
    {
        $specs = [
            ['landlord.verified', NotificationType::APPLICATION_SUBMITTED, 'New application', 'A tenant applied to one of your listings.', 'unread_delivered'],
            ['landlord.verified', NotificationType::LISTING_APPROVED, 'Listing approved', 'Your listing has been approved and is now live.', 'read_delivered'],
            ['landlord.verified', NotificationType::REVIEW_SUBMITTED, 'New review', 'A tenant left a review on one of your properties.', 'unread_delivered'],
            ['landlord.estate', NotificationType::APPLICATION_SUBMITTED, 'New application', 'A tenant applied to one of your listings.', 'unread_failed'],
            ['landlord.estate', NotificationType::CONTRACT_SIGNED, 'Lease signed', 'A tenant signed the lease you sent.', 'read_delivered'],
            ['landlord.coastal', NotificationType::LISTING_REJECTED, 'Listing rejected', 'A listing was rejected during moderation. See the reason and resubmit.', 'unread_delivered'],
            ['landlord.kumasi', NotificationType::REVIEW_RESPONSE, 'Review published', 'Your response to a tenant review is now public.', 'read_delivered'],
            ['landlord.pending', NotificationType::VERIFICATION_SUBMITTED, 'Verification submitted', 'Your verification documents are under review.', 'pending'],
        ];

        return $this->createFromSpecs($specs);
    }

    /**
     * @param  array<int,array{0:string,1:NotificationType,2:string,3:string,4:string}>  $specs
     */
    protected function createFromSpecs(array $specs): int
    {
        $count = 0;
        foreach ($specs as $i => [$userKey, $type, $title, $message, $state]) {
            $user = $this->user($userKey);
            if (! $user) {
                continue;
            }

            $this->createNotification($user, $type, $title, $message, $state, $i);
            $count++;
        }

        return $count;
    }

    protected function createNotification(User $user, NotificationType $type, string $title, string $message, string $state, int $i): void
    {
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => ['event_id' => 'seed-'.$type->value.'-'.$user->id.'-'.$i, 'seeded' => true],
        ]);

        $createdAt = now()->subDays(rand(0, 9))->subHours(rand(0, 23));
        $delivery = $this->deliveryColumns($state, $createdAt);

        $notification->forceFill(array_merge(['created_at' => $createdAt], $delivery))->saveQuietly();
    }

    /**
     * Map a state label to the concrete delivery/read columns.
     *
     * @return array<string,mixed>
     */
    protected function deliveryColumns(string $state, \Carbon\Carbon $createdAt): array
    {
        $delivered = $createdAt->copy()->addMinutes(2);

        return match ($state) {
            'unread_delivered' => ['read_at' => null, 'delivered_at' => $delivered],
            'read_delivered' => ['read_at' => $createdAt->copy()->addHours(3), 'delivered_at' => $delivered],
            'unread_failed' => ['read_at' => null, 'delivery_failed_at' => $delivered, 'delivery_error' => 'SMTP 550: mailbox unavailable'],
            'pending' => ['read_at' => null],
            'unread_sms' => ['read_at' => null, 'delivered_at' => $delivered, 'sms_delivered_at' => $delivered],
            'read_sms_failed' => ['read_at' => $createdAt->copy()->addHours(1), 'delivered_at' => $delivered, 'sms_failed_at' => $delivered, 'sms_error' => 'Twilio 30006: number unreachable'],
            default => [],
        };
    }

    protected function currencySymbol(): string
    {
        return 'GH₵';
    }
}
