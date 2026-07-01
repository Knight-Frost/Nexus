<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Granular admin RBAC (the "Phase 4" work referenced in the admins table).
     *
     * - capabilities: JSON list of AdminCapability values granted to a REGULAR
     *   admin. Ignored for super admins (they implicitly hold all capabilities).
     * - invited_at / invite_accepted_at: track admins created via the invite
     *   flow so the access page can show "pending invite" honestly and so a
     *   never-accepted invite can be safely revoked.
     */
    public function up(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->json('capabilities')->nullable()->after('is_super_admin');
            $table->timestamp('invited_at')->nullable()->after('last_login_at');
            $table->timestamp('invite_accepted_at')->nullable()->after('invited_at');
        });
    }

    public function down(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->dropColumn(['capabilities', 'invited_at', 'invite_accepted_at']);
        });
    }
};
