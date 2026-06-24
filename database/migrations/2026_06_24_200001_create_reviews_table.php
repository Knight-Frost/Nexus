<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('landlord_id')->constrained('users')->cascadeOnDelete();
            // contracts uses UUID PK — reference as string
            $table->string('contract_id', 36)->unique(); // one review per contract
            $table->foreign('contract_id')->references('id')->on('contracts')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating'); // 1..5 enforced in service/validation
            $table->string('title')->nullable();
            $table->text('body');
            $table->string('status', 20)->default('pending'); // pending|approved|rejected|hidden|flagged
            $table->text('moderation_reason')->nullable();
            $table->foreignId('moderated_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->text('landlord_response')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for common queries
            $table->index(['property_id', 'status']);
            $table->index(['landlord_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
