<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * MessagingWorkflowTest
 *
 * Covers tenant-initiated messaging against the Conversation / Message domain.
 *
 * Assumed routes (wired by supervisor, tenant middleware group):
 *   GET    /api/tenant/conversations                          → ConversationController@index
 *   POST   /api/tenant/conversations                          → ConversationController@store
 *   GET    /api/tenant/conversations/{conversation}           → ConversationController@show
 *   POST   /api/tenant/conversations/{conversation}/messages  → ConversationController@sendMessage
 */
class MessagingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Fixtures
    // -------------------------------------------------------------------------

    protected User $tenant;

    protected User $landlord;

    protected Listing $listing;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = User::factory()->tenant()->create();
        $this->landlord = User::factory()->landlord()->create();

        $property = Property::factory()->create(['landlord_id' => $this->landlord->id]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);
        $this->listing = Listing::factory()->active()->create([
            'unit_id' => $unit->id,
            'landlord_id' => $this->landlord->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Create a conversation between two users about a listing, optionally
     * seeding messages. Returns the Conversation.
     */
    private function makeConversation(
        User $participantOne,
        User $participantTwo,
        Listing $listing,
        array $messages = []
    ): Conversation {
        $conv = Conversation::create([
            'participant_one_type' => User::class,
            'participant_one_id' => $participantOne->id,
            'participant_two_type' => User::class,
            'participant_two_id' => $participantTwo->id,
            'subject_type' => Listing::class,
            'subject_id' => $listing->id,
            'title' => $listing->title,
            'status' => 'active',
            'last_message_at' => now(),
            'last_message_by' => $participantOne->id,
        ]);

        foreach ($messages as $msg) {
            Message::create(array_merge([
                'conversation_id' => $conv->id,
                'sender_type' => User::class,
                'is_read' => false,
                'is_system_message' => false,
                'has_attachments' => false,
            ], $msg));
        }

        return $conv;
    }

    // -------------------------------------------------------------------------
    // Unauthenticated guard
    // -------------------------------------------------------------------------

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/tenant/conversations')->assertStatus(401);
        $this->postJson('/api/tenant/conversations', [])->assertStatus(401);
    }

    // -------------------------------------------------------------------------
    // store — start a conversation
    // -------------------------------------------------------------------------

    public function test_tenant_can_start_a_conversation_with_listing_landlord(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $response = $this->postJson('/api/tenant/conversations', [
            'listing_id' => $this->listing->id,
            'body' => 'Hello, is this still available?',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('conversation.status', 'active')
            ->assertJsonPath('conversation.messages.0.body', 'Hello, is this still available?')
            ->assertJsonPath('conversation.messages.0.sender.is_me', true);

        $this->assertDatabaseHas('conversations', [
            'subject_type' => Listing::class,
            'subject_id' => $this->listing->id,
            'participant_one_type' => User::class,
            'participant_one_id' => $this->tenant->id,
            'participant_two_type' => User::class,
            'participant_two_id' => $this->landlord->id,
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('messages', [
            'sender_type' => User::class,
            'sender_id' => $this->tenant->id,
            'body' => 'Hello, is this still available?',
            'is_read' => false,
        ]);
    }

    public function test_starting_conversation_again_for_same_listing_reuses_existing(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $first = $this->postJson('/api/tenant/conversations', [
            'listing_id' => $this->listing->id,
            'body' => 'First message',
        ]);
        $first->assertStatus(201);
        $firstId = $first->json('conversation.id');

        $second = $this->postJson('/api/tenant/conversations', [
            'listing_id' => $this->listing->id,
            'body' => 'Second message',
        ]);
        $second->assertStatus(201);
        $secondId = $second->json('conversation.id');

        // Same conversation — no duplicate created
        $this->assertSame($firstId, $secondId);
        $this->assertDatabaseCount('conversations', 1);
        $this->assertDatabaseCount('messages', 2);
    }

    public function test_tenant_cannot_message_themselves(): void
    {
        // A tenant who is (artificially) also the listing's landlord. The actor
        // must be a tenant to clear the tenant-only route guard, so the
        // controller's self-conversation 422 check is actually exercised.
        $selfUser = User::factory()->tenant()->create();
        $property = Property::factory()->create(['landlord_id' => $selfUser->id]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);
        $listing = Listing::factory()->active()->create([
            'unit_id' => $unit->id,
            'landlord_id' => $selfUser->id,
        ]);

        // Now the same user acts as a tenant trying to contact their own listing
        Sanctum::actingAs($selfUser, [], 'sanctum');

        $this->postJson('/api/tenant/conversations', [
            'listing_id' => $listing->id,
            'body' => 'Am I talking to myself?',
        ])->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // index — list conversations
    // -------------------------------------------------------------------------

    public function test_index_lists_only_the_tenants_own_conversations(): void
    {
        // Conversation the tenant is in
        $ownConv = $this->makeConversation($this->tenant, $this->landlord, $this->listing);

        // Conversation between two OTHER users (should not appear)
        $otherTenant = User::factory()->tenant()->create();
        $otherLandlord = User::factory()->landlord()->create();
        $otherProp = Property::factory()->create(['landlord_id' => $otherLandlord->id]);
        $otherUnit = Unit::factory()->create(['property_id' => $otherProp->id]);
        $otherListing = Listing::factory()->active()->create([
            'unit_id' => $otherUnit->id,
            'landlord_id' => $otherLandlord->id,
        ]);
        $this->makeConversation($otherTenant, $otherLandlord, $otherListing);

        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $response = $this->getJson('/api/tenant/conversations');

        $response->assertStatus(200);
        $ids = collect($response->json())->pluck('id')->all();

        $this->assertContains($ownConv->id, $ids);
        $this->assertNotContains(
            Conversation::where('participant_one_id', $otherTenant->id)->value('id'),
            $ids
        );
    }

    // -------------------------------------------------------------------------
    // show — view conversation + mark-read
    // -------------------------------------------------------------------------

    public function test_show_returns_conversation_and_marks_other_party_messages_read(): void
    {
        // Landlord has sent an unread message to the tenant
        $conv = $this->makeConversation($this->tenant, $this->landlord, $this->listing, [
            [
                'sender_id' => $this->landlord->id,
                'body' => 'Welcome!',
                'is_read' => false,
            ],
        ]);

        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $response = $this->getJson("/api/tenant/conversations/{$conv->id}");

        $response->assertStatus(200);

        // Message from landlord should now be marked read in the DB
        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conv->id,
            'sender_id' => $this->landlord->id,
            'is_read' => true,
        ]);

        // Messages array in response
        $messages = $response->json('messages');
        $this->assertNotEmpty($messages);
        $this->assertSame('Welcome!', $messages[0]['body']);
        $this->assertFalse($messages[0]['sender']['is_me']);
    }

    public function test_show_returns_403_for_non_participant(): void
    {
        $conv = $this->makeConversation($this->tenant, $this->landlord, $this->listing);

        $outsider = User::factory()->tenant()->create();
        Sanctum::actingAs($outsider, [], 'sanctum');

        $this->getJson("/api/tenant/conversations/{$conv->id}")->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // sendMessage — post a message
    // -------------------------------------------------------------------------

    public function test_participant_can_send_a_message(): void
    {
        $conv = $this->makeConversation($this->tenant, $this->landlord, $this->listing);

        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $response = $this->postJson("/api/tenant/conversations/{$conv->id}/messages", [
            'body' => 'Is parking included?',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('message.body', 'Is parking included?')
            ->assertJsonPath('message.sender.is_me', true);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conv->id,
            'sender_id' => $this->tenant->id,
            'body' => 'Is parking included?',
        ]);
    }

    public function test_non_participant_cannot_send_a_message(): void
    {
        $conv = $this->makeConversation($this->tenant, $this->landlord, $this->listing);
        $outsider = User::factory()->tenant()->create();

        Sanctum::actingAs($outsider, [], 'sanctum');

        $this->postJson("/api/tenant/conversations/{$conv->id}/messages", [
            'body' => 'Intruder!',
        ])->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Unread count logic
    // -------------------------------------------------------------------------

    public function test_unread_count_increments_when_other_party_sends_message(): void
    {
        // Create conversation and seed an unread message from the landlord
        $conv = $this->makeConversation($this->tenant, $this->landlord, $this->listing, [
            [
                'sender_id' => $this->landlord->id,
                'body' => 'Hey there!',
                'is_read' => false,
            ],
        ]);

        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $response = $this->getJson('/api/tenant/conversations');
        $response->assertStatus(200);

        $item = collect($response->json())->firstWhere('id', $conv->id);
        $this->assertNotNull($item);
        $this->assertSame(1, (int) $item['unread_count']);
    }

    public function test_unread_count_resets_to_zero_after_tenant_opens_conversation(): void
    {
        $conv = $this->makeConversation($this->tenant, $this->landlord, $this->listing, [
            [
                'sender_id' => $this->landlord->id,
                'body' => 'Hey there!',
                'is_read' => false,
            ],
        ]);

        Sanctum::actingAs($this->tenant, [], 'sanctum');

        // Open the conversation — this triggers mark-read
        $this->getJson("/api/tenant/conversations/{$conv->id}")->assertStatus(200);

        // Index should now report 0
        $response = $this->getJson('/api/tenant/conversations');
        $item = collect($response->json())->firstWhere('id', $conv->id);
        $this->assertNotNull($item);
        $this->assertSame(0, (int) $item['unread_count']);
    }
}
