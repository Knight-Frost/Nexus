<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * ResetPasswordNotification
 *
 * Sends a password-reset link that points at the SPA (/reset-password).
 * The URL is pre-built by User::sendPasswordResetNotification so this
 * notification just formats and delivers it.
 */
class ResetPasswordNotification extends Notification
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
            ->subject('Reset your '.config('brand.display_name').' password')
            ->greeting('Hello,')
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->action('Reset Password', $this->url)
            ->line('This password reset link will expire in 60 minutes.')
            ->line('If you did not request a password reset, no further action is required.');
    }
}
