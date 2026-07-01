<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * AdminAccessChangedNotification
 *
 * Emails an admin when their platform access changes (capabilities updated,
 * promoted/demoted, deactivated/reactivated). Admins have no in-app channel,
 * so email is the honest way to keep an affected admin informed. The message
 * intentionally omits the exact capability list — the audit log is the record.
 */
class AdminAccessChangedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $headline,
        public readonly string $detail,
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
            ->subject($this->headline.' · '.config('brand.display_name'))
            ->greeting('Hello,')
            ->line($this->detail)
            ->line('If you have questions about this change, contact a super admin.');
    }
}
