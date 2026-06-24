<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\ListingPhoto;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * MessageAttachmentTest
 *
 * Covers:
 *   - Uploading single and multiple attachments alongside (or instead of) a message body
 *   - Validation rules: unsupported type, oversized file, too many files, empty payload
 *   - JSON contract: has_attachments, attachments array with correct metadata,
 *     ABSENCE of stored_path / disk
 *   - Download endpoint: participant can stream file; non-participant gets 403;
 *     unauthenticated gets 401
 *   - Conversation show response: thumbnail_url + other_participant.role
 *
 * Routes under test:
 *   POST /api/tenant/conversations/{conversation}/messages
 *   GET  /api/tenant/messages/attachments/{attachment}
 *   GET  /api/tenant/conversations/{conversation}
 */
class MessageAttachmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $tenant;

    protected User $landlord;

    protected Listing $listing;

    protected Conversation $conversation;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->tenant = User::factory()->tenant()->create();
        $this->landlord = User::factory()->landlord()->create();

        $property = Property::factory()->create(['landlord_id' => $this->landlord->id]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);
        $this->listing = Listing::factory()->active()->create([
            'unit_id' => $unit->id,
            'landlord_id' => $this->landlord->id,
        ]);

        $this->conversation = Conversation::create([
            'participant_one_type' => User::class,
            'participant_one_id' => $this->tenant->id,
            'participant_two_type' => User::class,
            'participant_two_id' => $this->landlord->id,
            'subject_type' => Listing::class,
            'subject_id' => $this->listing->id,
            'title' => $this->listing->title,
            'status' => 'active',
            'last_message_at' => now(),
            'last_message_by' => $this->tenant->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Test 1: single PNG attachment → 201, attachment_type 'image', stored on disk, DB row
    // -------------------------------------------------------------------------

    public function test_tenant_can_send_message_with_single_png_attachment(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $file = UploadedFile::fake()->image('photo.png', 100, 100);

        $response = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'Here is a photo',
                'attachments' => [$file],
            ]
        );

        $response->assertStatus(201);

        // has_attachments must be true
        $response->assertJsonPath('message.has_attachments', true);

        // Exactly 1 attachment in response
        $attachments = $response->json('message.attachments');
        $this->assertCount(1, $attachments);
        $this->assertSame('image', $attachments[0]['attachment_type']);
        $this->assertSame('photo.png', $attachments[0]['original_name']);
        $this->assertSame('image/png', $attachments[0]['mime_type']);

        // File exists on fake disk
        $messageId = $response->json('message.id');
        $dbAttachment = MessageAttachment::where('message_id', $messageId)->first();
        $this->assertNotNull($dbAttachment);
        Storage::disk('local')->assertExists($dbAttachment->stored_path);

        // DB has the attachment row
        $this->assertDatabaseHas('message_attachments', [
            'message_id' => $messageId,
            'original_name' => 'photo.png',
            'attachment_type' => 'image',
        ]);

        // JSON MUST NOT contain stored_path or disk
        $rawJson = $response->getContent();
        $this->assertStringNotContainsString('stored_path', $rawJson);
        $this->assertStringNotContainsString('"disk"', $rawJson);
    }

    // -------------------------------------------------------------------------
    // Test 2: PDF → attachment_type 'file'
    // -------------------------------------------------------------------------

    public function test_pdf_attachment_gets_attachment_type_file(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $file = UploadedFile::fake()->create('contract.pdf', 100, 'application/pdf');

        $response = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'Here is the contract',
                'attachments' => [$file],
            ]
        );

        $response->assertStatus(201);

        $attachments = $response->json('message.attachments');
        $this->assertCount(1, $attachments);
        $this->assertSame('file', $attachments[0]['attachment_type']);
    }

    // -------------------------------------------------------------------------
    // Test 3: text body + attachment together → both persisted
    // -------------------------------------------------------------------------

    public function test_body_and_attachment_together_are_both_persisted(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $file = UploadedFile::fake()->image('shot.jpg', 50, 50);

        $response = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'Please see attached.',
                'attachments' => [$file],
            ]
        );

        $response->assertStatus(201);
        $this->assertSame('Please see attached.', $response->json('message.body'));
        $this->assertCount(1, $response->json('message.attachments'));
        $this->assertTrue($response->json('message.has_attachments'));

        $this->assertDatabaseHas('messages', [
            'body' => 'Please see attached.',
            'has_attachments' => true,
        ]);
    }

    // -------------------------------------------------------------------------
    // Test 4: attachments-only (no body) → 201 allowed
    // -------------------------------------------------------------------------

    public function test_attachment_only_message_without_body_is_accepted(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $file = UploadedFile::fake()->image('photo.png', 100, 100);

        $response = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'attachments' => [$file],
            ]
        );

        $response->assertStatus(201);
        $this->assertTrue($response->json('message.has_attachments'));
        $this->assertCount(1, $response->json('message.attachments'));
    }

    // -------------------------------------------------------------------------
    // Test 5: empty (no body, no attachments) → 422
    // -------------------------------------------------------------------------

    public function test_empty_message_with_no_body_and_no_attachments_is_rejected(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            []
        )->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Test 6: unsupported file type (.exe) → 422, nothing stored
    // -------------------------------------------------------------------------

    public function test_unsupported_file_type_is_rejected(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $file = UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream');

        $response = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'This is fine',
                'attachments' => [$file],
            ]
        );

        $response->assertStatus(422);
        $this->assertDatabaseCount('message_attachments', 0);
        $this->assertDatabaseCount('messages', 0);
    }

    // -------------------------------------------------------------------------
    // Test 7: oversized file (>10 MB) → 422
    // -------------------------------------------------------------------------

    public function test_oversized_file_is_rejected(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        // 11 MB — exceeds the 10 MB (10240 KB) limit
        $file = UploadedFile::fake()->create('bigfile.pdf', 11 * 1024, 'application/pdf');

        $response = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'Large file attached',
                'attachments' => [$file],
            ]
        );

        $response->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Test 8: too many files (6) → 422
    // -------------------------------------------------------------------------

    public function test_more_than_five_attachments_is_rejected(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $files = array_map(
            fn ($i) => UploadedFile::fake()->image("photo{$i}.png", 10, 10),
            range(1, 6)
        );

        $response = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'Six files',
                'attachments' => $files,
            ]
        );

        $response->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Test 9: download by participant tenant → 200 with correct Content-Type
    // -------------------------------------------------------------------------

    public function test_participant_can_download_attachment(): void
    {
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        // First, send a message with an attachment via the API to set up real storage
        $file = UploadedFile::fake()->image('download-test.png', 100, 100);

        $sendResponse = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'Downloadable',
                'attachments' => [$file],
            ]
        );
        $sendResponse->assertStatus(201);

        $attachmentId = $sendResponse->json('message.attachments.0.id');
        $this->assertNotNull($attachmentId);

        $downloadResponse = $this->get("/api/tenant/messages/attachments/{$attachmentId}");

        $downloadResponse->assertStatus(200);
        $this->assertStringContainsString('image/', $downloadResponse->headers->get('Content-Type'));
    }

    // -------------------------------------------------------------------------
    // Test 10: download by non-participant → 403
    // -------------------------------------------------------------------------

    public function test_non_participant_cannot_download_attachment(): void
    {
        // Create the attachment as the real tenant
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $file = UploadedFile::fake()->image('secret.png', 10, 10);

        $sendResponse = $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'Secret',
                'attachments' => [$file],
            ]
        );
        $sendResponse->assertStatus(201);
        $attachmentId = $sendResponse->json('message.attachments.0.id');

        // Now a different tenant tries to download
        $outsider = User::factory()->tenant()->create();
        Sanctum::actingAs($outsider, [], 'sanctum');

        $this->get("/api/tenant/messages/attachments/{$attachmentId}")
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 11: download unauthenticated → 401
    // -------------------------------------------------------------------------

    public function test_unauthenticated_user_cannot_download_attachment(): void
    {
        // Create an attachment via DB directly (no auth needed for setup)
        $message = Message::create([
            'conversation_id' => $this->conversation->id,
            'sender_type' => User::class,
            'sender_id' => $this->tenant->id,
            'body' => 'Has attachment',
            'is_read' => false,
            'is_system_message' => false,
            'has_attachments' => true,
        ]);

        $attachment = MessageAttachment::create([
            'message_id' => $message->id,
            'original_name' => 'test.png',
            'stored_path' => 'message-attachments/1/test.png',
            'disk' => 'local',
            'mime_type' => 'image/png',
            'size_bytes' => 1024,
            'attachment_type' => 'image',
        ]);

        $this->getJson("/api/tenant/messages/attachments/{$attachment->id}")
            ->assertStatus(401);
    }

    // -------------------------------------------------------------------------
    // Test 12: show() response includes attachments metadata, thumbnail_url,
    //          and other_participant.role
    // -------------------------------------------------------------------------

    public function test_show_conversation_includes_attachments_thumbnail_and_role(): void
    {
        // Seed a primary photo for the listing
        ListingPhoto::create([
            'listing_id' => $this->listing->id,
            'path' => 'listings/photos/thumbnail.jpg',
            'disk' => 'local',
            'filename' => 'thumbnail.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 5000,
            'is_primary' => true,
            'sort_order' => 0,
        ]);

        // Send a message with an attachment so it is visible in the show response
        Sanctum::actingAs($this->tenant, [], 'sanctum');

        $file = UploadedFile::fake()->image('proof.png', 10, 10);

        $this->postJson(
            "/api/tenant/conversations/{$this->conversation->id}/messages",
            [
                'body' => 'See attached proof',
                'attachments' => [$file],
            ]
        )->assertStatus(201);

        // Now call show
        $response = $this->getJson("/api/tenant/conversations/{$this->conversation->id}");

        $response->assertStatus(200);

        // thumbnail_url from listing primary photo
        $this->assertSame(
            'listings/photos/thumbnail.jpg',
            $response->json('conversation.thumbnail_url')
        );

        // other_participant.role should be 'landlord' (the other user)
        $this->assertSame('landlord', $response->json('conversation.other_participant.role'));

        // Messages array has the attachment metadata
        $messages = $response->json('messages');
        $this->assertNotEmpty($messages);

        // Find the message with has_attachments = true
        $msgWithAttachment = collect($messages)->first(fn ($m) => $m['has_attachments'] === true);
        $this->assertNotNull($msgWithAttachment);
        $this->assertCount(1, $msgWithAttachment['attachments']);
        $this->assertSame('image', $msgWithAttachment['attachments'][0]['attachment_type']);

        // JSON must not contain stored_path or disk
        $rawJson = $response->getContent();
        $this->assertStringNotContainsString('stored_path', $rawJson);
    }
}
