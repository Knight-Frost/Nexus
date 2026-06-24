<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();

            // The user who owns / is associated with this document
            $table->foreignId('owner_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // The user who actually uploaded the file (may differ in future cross-role flows)
            $table->foreignId('uploaded_by_id')
                ->constrained('users');

            $table->string('document_type')->index();
            $table->string('original_filename');

            // SECURITY: stored_path and disk are sensitive — keep in DB but hidden from JSON output
            $table->string('stored_path');
            $table->string('disk')->default('local');

            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes');

            // Admin/system verification timestamp
            $table->timestamp('verified_at')->nullable();

            // Polymorphic link to application / maintenance / contract (for future use)
            $table->nullableMorphs('related'); // related_type + related_id + index

            $table->timestamps();
            $table->softDeletes();

            // Composite index for common query: all documents belonging to a user of a certain type
            $table->index(['owner_user_id', 'document_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
