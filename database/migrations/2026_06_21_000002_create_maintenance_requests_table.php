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
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();

            // Tenant who submitted the request
            $table->foreignId('tenant_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Contract this request is filed against (UUID PK on contracts)
            $table->foreignUuid('contract_id')
                ->constrained('contracts')
                ->cascadeOnDelete();

            // Denormalised for fast scoped queries without joins
            $table->foreignId('property_id')
                ->constrained('properties');

            $table->foreignId('unit_id')
                ->constrained('units');

            $table->foreignId('landlord_id')
                ->constrained('users');

            // Request detail
            $table->string('title');
            $table->text('description');
            $table->string('category')->default('general');
            $table->string('priority')->default('medium');
            $table->string('status')->default('open')->index();

            // Resolution
            $table->text('resolution_notes')->nullable();

            // Lifecycle timestamps
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Composite indexes for the two primary list queries
            $table->index(['tenant_id', 'status']);
            $table->index(['landlord_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_requests');
    }
};
