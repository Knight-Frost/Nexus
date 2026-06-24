<?php

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\ListingRejected;
use App\Models\EmailLog;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * SendListingRejectedNotification Listener
 *
 * Creates an in-app notification for the listing's landlord (with rejection reason)
 * and logs an email intent.
 */
class SendListingRejectedNotification implements ShouldQueue
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function handle(ListingRejected $event): void
    {
        $listing = $event->listing;
        $landlord = $listing->landlord;
        $reason = $event->reason;

        // Idempotent event ID
        $eventId = "listing-rejected:{$listing->id}";

        // Create in-app notification for the landlord (idempotent)
        if (! $this->notificationService->exists($landlord, $eventId)) {
            $this->notificationService->create(
                user: $landlord,
                type: NotificationType::LISTING_REJECTED,
                title: 'Listing Needs Changes',
                message: "Your listing \"{$listing->title}\" was not approved. Reason: {$reason}",
                data: [
                    'event_id' => $eventId,
                    'listing_id' => $listing->id,
                    'reason' => $reason,
                ]
            );
        }

        // Email log intent
        EmailLog::create([
            'recipient_type' => get_class($landlord),
            'recipient_id' => $landlord->id,
            'recipient_email' => $landlord->email,
            'subject' => 'Listing Rejected - Action Required',
            'mailable_class' => 'ListingRejectedNotification',
            'email_type' => 'notification',
            'related_type' => get_class($listing),
            'related_id' => $listing->id,
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }
}
