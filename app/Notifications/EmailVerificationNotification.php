<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * EmailVerificationNotification
 *
 * Sends a signed verification link that points at the SPA (/verify-email).
 * The URL is pre-built by the controller so this notification just delivers it.
 */
class EmailVerificationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $url
    ) {}

    /**
     * @return array<string>
     */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Verify your email address')
            ->greeting('Hello,')
            ->line('Please click the button below to verify your email address.')
            ->action('Verify Email', $this->url)
            ->line('This link will expire in 60 minutes.')
            ->line('If you did not create an account, no further action is required.');
    }
}
