<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Admin Model
 *
 * Completely separate from User model.
 * Phase 1: All admins are Super Admins.
 * Phase 4: RBAC expansion.
 */
class Admin extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'email',
        'password',
        'name',
        'is_super_admin',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_super_admin' => 'boolean',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Check if this admin is a super admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin === true;
    }

    /**
     * Update last login timestamp
     */
    public function recordLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }

    /**
     * Prevent deletion of admin accounts.
     *
     * Phase 1: All admins are super admins and no admin may delete another
     * admin account. Granular super-admin RBAC (who, if anyone, may remove an
     * admin) arrives in Phase 4 — until then this is a hard, model-level guard
     * so NO caller (controller, job, tinker, future code) can delete an admin.
     *
     * @throws \RuntimeException Always
     */
    public function delete()
    {
        throw new \RuntimeException(
            'Admin accounts cannot be deleted yet. Removing an admin will be '.
            'gated behind super-admin RBAC (Phase 4); see App\\Models\\Admin.'
        );
    }

    /**
     * Prevent force-deletion of admin accounts (same guarantee as delete()).
     *
     * @throws \RuntimeException Always
     */
    public function forceDelete()
    {
        throw new \RuntimeException(
            'Admin accounts cannot be deleted yet. Removing an admin will be '.
            'gated behind super-admin RBAC (Phase 4); see App\\Models\\Admin.'
        );
    }

    /**
     * Scope: Only active admins
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Relationships
     */

    // Listings reviewed by this admin
    public function reviewedListings()
    {
        return $this->hasMany(Listing::class, 'reviewed_by');
    }

    // Features enabled by this admin
    public function enabledFeatures()
    {
        return $this->hasMany(LandlordFeature::class, 'enabled_by');
    }

    // Audit trail
    public function auditLogs()
    {
        return $this->morphMany(AuditLog::class, 'actor');
    }
}
