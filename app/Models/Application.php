<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Application Model
 *
 * Represents a tenant's application to a rental listing.
 *
 * SECURITY: landlord_notes is hidden from JSON serialization so it is never
 * leaked to tenants. Controllers that are landlord-scoped may call
 * makeVisible('landlord_notes') when returning data to the landlord.
 */
class Application extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'listing_id',
        'landlord_id',
        'status',
        'cover_note',
        'landlord_notes',
        'decision_reason',
        'submitted_at',
        'reviewed_at',
        'decided_at',
        'withdrawn_at',
    ];

    /**
     * SECURITY: landlord_notes must never appear in tenant-facing JSON responses.
     */
    protected $hidden = ['landlord_notes'];

    protected $casts = [
        'status' => ApplicationStatus::class,
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'decided_at' => 'datetime',
        'withdrawn_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The tenant who submitted this application.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    /**
     * The landlord who owns the listing this application targets.
     */
    public function landlord(): BelongsTo
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    /**
     * The listing this application is for.
     */
    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Scope to only active (non-final) applications.
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', [
            ApplicationStatus::SUBMITTED->value,
            ApplicationStatus::IN_REVIEW->value,
            ApplicationStatus::LANDLORD_REVIEW->value,
        ]);
    }
}
