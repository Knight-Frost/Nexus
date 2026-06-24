<?php

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\ListingPublished;
use App\Models\EmailLog;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * SendListingPublishedNotification Listener
 *
 * Creates an in-app notification for the listing's landlord and logs an email intent.
 */
class SendListingPublishedNotification implements ShouldQueue
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function handle(ListingPublished $event): void
    {
        $listing = $event->listing;
        $landlord = $listing->landlord;

        // Idempotent event ID
        $eventId = "listing-approved:{$listing->id}";

        // Create in-app notification for the landlord (idempotent)
        if (! $this->notificationService->exists($landlord, $eventId)) {
            $this->notificationService->create(
                user: $landlord,
                type: NotificationType::LISTING_APPROVED,
                title: 'Listing Approved',
                message: "Your listing \"{$listing->title}\" has been approved and is now live.",
                data: [
                    'event_id' => $eventId,
                    'listing_id' => $listing->id,
                ]
            );
        }

        // Email log intent
        EmailLog::create([
            'recipient_type' => get_class($landlord),
            'recipient_id' => $landlord->id,
            'recipient_email' => $landlord->email,
            'subject' => 'Your Listing is Now Live',
            'mailable_class' => 'ListingPublishedNotification',
            'email_type' => 'notification',
            'related_type' => get_class($listing),
            'related_id' => $listing->id,
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }
}
