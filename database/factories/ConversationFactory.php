<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Conversation>
 */
class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    public function definition(): array
    {
        $participantOne = User::factory()->tenant()->create();
        $participantTwo = User::factory()->landlord()->create();

        return [
            'participant_one_type' => User::class,
            'participant_one_id' => $participantOne->id,
            'participant_two_type' => User::class,
            'participant_two_id' => $participantTwo->id,
            'subject_type' => null,
            'subject_id' => null,
            'title' => 'Test Conversation',
            'status' => 'active',
            'last_message_at' => now(),
            'last_message_by' => $participantOne->id,
        ];
    }

    /**
     * Attach the conversation to a listing subject.
     */
    public function forListing(Listing $listing): static
    {
        return $this->state(fn (array $attributes) => [
            'subject_type' => Listing::class,
            'subject_id' => $listing->id,
            'title' => $listing->title,
        ]);
    }
}
