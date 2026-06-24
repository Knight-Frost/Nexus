<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Owner is the subject who ultimately owns the asset (e.g. the landlord who owns
            // a property gallery, or the user whose avatar it is).
            $table->foreignId('owner_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Uploader may differ from owner (e.g. an admin uploading on behalf of a user).
            $table->foreignId('uploaded_by_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Polymorphic link to the resource this asset belongs to
            // (Property, Unit, Listing, MaintenanceRequest, User for avatar, etc.)
            $table->nullableMorphs('attachable');

            // Logical grouping within an attachable context
            $table->string('collection'); // MediaCollection enum value

            // Storage fields — hidden from JSON via $hidden; served via controlled route
            $table->string('disk');
            $table->string('path');

            // File metadata
            $table->string('original_filename');
            $table->string('stored_filename');
            $table->string('mime_type');
            $table->string('extension')->nullable();
            $table->unsignedBigInteger('size_bytes');
            $table->string('checksum')->nullable(); // SHA-256 hex digest

            // Access control
            $table->string('visibility')->default('public'); // MediaVisibility enum value

            // Presentation
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('alt_text')->nullable();
            $table->text('caption')->nullable();

            // Lifecycle
            $table->string('status')->default('active'); // active | archived

            $table->timestamps();
            $table->softDeletes();

            // Composite index for fetching all media for a resource+collection
            $table->index(['attachable_type', 'attachable_id', 'collection'], 'media_attachable_collection_idx');
            // Index for owner-scoped queries (e.g. list my avatars)
            $table->index('owner_user_id', 'media_owner_idx');
            // Index for admin / status-scoped queries
            $table->index(['collection', 'status'], 'media_collection_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_assets');
    }
};
