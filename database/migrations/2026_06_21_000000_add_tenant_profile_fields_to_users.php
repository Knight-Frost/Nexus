<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds tenant-facing profile fields that power the real (non-hardcoded)
     * tenant readiness score and the dashboard greeting/location.
     *
     * why: the prior UI hardcoded "Accra" and a 75% readiness ring with a
     * "Next of kin" item that had no backing column. These columns make those
     * claims real and editable by the tenant.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('city')->nullable()->after('phone');
            $table->string('next_of_kin_name')->nullable()->after('city');
            $table->string('next_of_kin_phone')->nullable()->after('next_of_kin_name');
            $table->string('next_of_kin_relationship')->nullable()->after('next_of_kin_phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'city',
                'next_of_kin_name',
                'next_of_kin_phone',
                'next_of_kin_relationship',
            ]);
        });
    }
};
