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
        Schema::create('applications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tenant_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('listing_id')
                ->constrained('listings')
                ->cascadeOnDelete();

            // Denormalized from listing at creation time for query efficiency
            $table->foreignId('landlord_id')
                ->constrained('users');

            $table->string('status')->default('submitted')->index();

            $table->text('cover_note')->nullable();

            // Internal landlord notes — never exposed to tenants (hidden on model)
            $table->text('landlord_notes')->nullable();

            $table->text('decision_reason')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamp('withdrawn_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Composite indexes for common scoped queries
            $table->index(['tenant_id', 'status']);
            $table->index(['landlord_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
