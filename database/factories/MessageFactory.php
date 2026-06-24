<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Message>
 */
class MessageFactory extends Factory
{
    protected $model = Message::class;

    public function definition(): array
    {
        $sender = User::factory()->tenant()->create();

        return [
            'conversation_id' => Conversation::factory(),
            'sender_type' => User::class,
            'sender_id' => $sender->id,
            'body' => 'Test message body',
            'is_read' => false,
            'is_system_message' => false,
            'has_attachments' => false,
        ];
    }

    /**
     * Mark message as having attachments.
     */
    public function withAttachments(): static
    {
        return $this->state(fn (array $attributes) => [
            'has_attachments' => true,
        ]);
    }
}
