<?php

namespace App\Notifications;

use App\Models\LearnerInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LearnerInvited extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public LearnerInvitation $invitation,
        public string $plainTextToken,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('You have been invited to Junior Mode'))
            ->greeting(__('Hello!'))
            ->line(__(':mentor invited you to join Junior Mode as a Learner.', [
                'mentor' => $this->invitation->mentor->name,
            ]))
            ->action(
                __('Accept invitation'),
                route('learner-invitations.accept', $this->plainTextToken),
            )
            ->line(__('This invitation expires in seven days.'));
    }
}
