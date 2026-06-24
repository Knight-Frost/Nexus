<?php

namespace Tests\Feature;

use App\Enums\DocumentType;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * DocumentWorkflowTest
 *
 * Covers the tenant document upload / download / delete lifecycle.
 *
 * Routes assumed (supervisor wires these):
 *   GET    /api/tenant/documents                   → DocumentController@index
 *   POST   /api/tenant/documents                   → DocumentController@store
 *   GET    /api/tenant/documents/{document}/download → DocumentController@download
 *   DELETE /api/tenant/documents/{document}         → DocumentController@destroy
 *
 * All routes sit behind auth:sanctum + 'tenant' middleware.
 */
class DocumentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $tenant;

    protected User $otherTenant;

    protected function setUp(): void
    {
        parent::setUp();

        // Replace the 'local' disk with an in-memory fake so no real files are written
        Storage::fake('local');

        $this->tenant = User::factory()->tenant()->create();
        $this->otherTenant = User::factory()->tenant()->create();
    }

    // -------------------------------------------------------------------------
    // Upload
    // -------------------------------------------------------------------------

    public function test_tenant_can_upload_valid_pdf(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        $file = UploadedFile::fake()->create('payslip.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/tenant/documents', [
            'file' => $file,
            'document_type' => DocumentType::PROOF_OF_INCOME->value,
        ]);

        $response->assertStatus(201);

        // Row exists in database
        $this->assertDatabaseHas('documents', [
            'owner_user_id' => $this->tenant->id,
            'document_type' => DocumentType::PROOF_OF_INCOME->value,
        ]);

        // Physical file exists on the fake local disk
        $storedPath = Document::where('owner_user_id', $this->tenant->id)->first()->stored_path;
        Storage::disk('local')->assertExists($storedPath);

        // Sensitive fields must NOT appear in the JSON response
        $response->assertJsonMissing(['stored_path']);
        $response->assertJsonMissing(['disk']);
    }

    public function test_upload_rejects_executable_file(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        $file = UploadedFile::fake()->create('evil.php', 10, 'application/x-httpd-php');

        $this->postJson('/api/tenant/documents', [
            'file' => $file,
            'document_type' => DocumentType::OTHER->value,
        ])->assertStatus(422);
    }

    public function test_upload_rejects_exe_file(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        $file = UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream');

        $this->postJson('/api/tenant/documents', [
            'file' => $file,
            'document_type' => DocumentType::OTHER->value,
        ])->assertStatus(422);
    }

    public function test_upload_rejects_oversized_file(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        // 11 000 KB = ~10.7 MB — over the 10 MB limit
        $file = UploadedFile::fake()->create('big.pdf', 11000, 'application/pdf');

        $this->postJson('/api/tenant/documents', [
            'file' => $file,
            'document_type' => DocumentType::PROOF_OF_INCOME->value,
        ])->assertStatus(422);
    }

    public function test_upload_rejects_invalid_document_type(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $this->postJson('/api/tenant/documents', [
            'file' => $file,
            'document_type' => 'not_a_real_type',
        ])->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    public function test_index_returns_only_own_documents(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        // Own document
        $ownDoc = Document::factory()->create([
            'owner_user_id' => $this->tenant->id,
            'uploaded_by_id' => $this->tenant->id,
        ]);

        // Another user's document — must NOT appear in the response
        $otherDoc = Document::factory()->create([
            'owner_user_id' => $this->otherTenant->id,
            'uploaded_by_id' => $this->otherTenant->id,
        ]);

        $response = $this->getJson('/api/tenant/documents');

        $response->assertOk();

        $ids = collect($response->json())->pluck('id');
        $this->assertTrue($ids->contains($ownDoc->id));
        $this->assertFalse($ids->contains($otherDoc->id));
    }

    // -------------------------------------------------------------------------
    // Download
    // -------------------------------------------------------------------------

    public function test_tenant_can_download_own_document(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        // Create a real file on the fake disk
        $storedPath = 'documents/'.$this->tenant->id.'/test-file.pdf';
        Storage::disk('local')->put($storedPath, '%PDF-1.4 fake content');

        $document = Document::factory()->create([
            'owner_user_id' => $this->tenant->id,
            'uploaded_by_id' => $this->tenant->id,
            'stored_path' => $storedPath,
            'disk' => 'local',
            'original_filename' => 'payslip.pdf',
            'mime_type' => 'application/pdf',
        ]);

        $response = $this->get('/api/tenant/documents/'.$document->id.'/download');

        $response->assertOk();
        // Laravel's download response sets Content-Disposition
        $this->assertStringContainsString(
            'attachment',
            $response->headers->get('Content-Disposition') ?? ''
        );
    }

    public function test_tenant_cannot_download_another_users_document(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        $storedPath = 'documents/'.$this->otherTenant->id.'/other-file.pdf';
        Storage::disk('local')->put($storedPath, 'content');

        $document = Document::factory()->create([
            'owner_user_id' => $this->otherTenant->id,
            'uploaded_by_id' => $this->otherTenant->id,
            'stored_path' => $storedPath,
            'disk' => 'local',
            'original_filename' => 'other.pdf',
            'mime_type' => 'application/pdf',
        ]);

        $this->get('/api/tenant/documents/'.$document->id.'/download')
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public function test_tenant_can_delete_own_document(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        $storedPath = 'documents/'.$this->tenant->id.'/to-delete.pdf';
        Storage::disk('local')->put($storedPath, 'content');

        $document = Document::factory()->create([
            'owner_user_id' => $this->tenant->id,
            'uploaded_by_id' => $this->tenant->id,
            'stored_path' => $storedPath,
            'disk' => 'local',
        ]);

        $this->deleteJson('/api/tenant/documents/'.$document->id)
            ->assertOk()
            ->assertJsonFragment(['message' => 'Document deleted successfully.']);

        // File removed from disk
        Storage::disk('local')->assertMissing($storedPath);

        // Row is soft-deleted (not hard deleted)
        $this->assertSoftDeleted('documents', ['id' => $document->id]);
    }

    public function test_tenant_cannot_delete_another_users_document(): void
    {
        Sanctum::actingAs($this->tenant, ['*']);

        $storedPath = 'documents/'.$this->otherTenant->id.'/protected.pdf';
        Storage::disk('local')->put($storedPath, 'content');

        $document = Document::factory()->create([
            'owner_user_id' => $this->otherTenant->id,
            'uploaded_by_id' => $this->otherTenant->id,
            'stored_path' => $storedPath,
            'disk' => 'local',
        ]);

        $this->deleteJson('/api/tenant/documents/'.$document->id)
            ->assertStatus(403);

        // File must still exist
        Storage::disk('local')->assertExists($storedPath);
    }

    // -------------------------------------------------------------------------
    // Authentication guard
    // -------------------------------------------------------------------------

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/tenant/documents')
            ->assertStatus(401);
    }
}
