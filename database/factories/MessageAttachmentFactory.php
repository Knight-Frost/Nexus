<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MessageAttachment>
 */
class MessageAttachmentFactory extends Factory
{
    protected $model = MessageAttachment::class;

    public function definition(): array
    {
        return [
            'message_id' => Message::factory(),
            'original_name' => 'test.png',
            'stored_path' => 'message-attachments/1/test.png',
            'disk' => 'local',
            'mime_type' => 'image/png',
            'size_bytes' => 1024,
            'attachment_type' => 'image',
        ];
    }

    /**
     * Create a file (non-image) attachment.
     */
    public function asFile(): static
    {
        return $this->state(fn (array $attributes) => [
            'original_name' => 'test.pdf',
            'stored_path' => 'message-attachments/1/test.pdf',
            'mime_type' => 'application/pdf',
            'attachment_type' => 'file',
        ]);
    }
}
