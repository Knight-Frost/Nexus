<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * AdminInvitationNotification
 *
 * Emails an invited admin a secure set-password link pointing at the SPA
 * (/accept-invite). The token is created by the `admins` password broker; the
 * link is pre-built by AdminAccessService so this notification only formats it.
 */
class AdminInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $url,
        public readonly string $inviterName,
        public readonly bool $isSuperAdmin,
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
        $brand = config('brand.display_name');
        $tier = $this->isSuperAdmin ? 'Super Admin' : 'Admin';

        return (new MailMessage)
            ->subject("You've been invited to the {$brand} admin team")
            ->greeting('Hello,')
            ->line("{$this->inviterName} has invited you to join the {$brand} admin team as a {$tier}.")
            ->line('Set your password to activate your admin account and sign in.')
            ->action('Set your password', $this->url)
            ->line('This invitation link will expire in 24 hours.')
            ->line('If you were not expecting this invitation, you can safely ignore this email.');
    }
}
