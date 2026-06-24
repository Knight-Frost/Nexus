<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Review Model
 *
 * A tenant's rating of a property, governed by contract eligibility.
 * ELIGIBILITY: reviewer must have an active|terminated|expired contract on the property.
 * UNIQUENESS: one review per contract (enforced by unique constraint on contract_id).
 * VISIBILITY: only approved reviews are surfaced publicly.
 */
class Review extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reviewer_user_id',
        'property_id',
        'unit_id',
        'landlord_id',
        'contract_id',
        'rating',
        'title',
        'body',
        'status',
        'moderation_reason',
        'moderated_by_admin_id',
        'landlord_response',
        'responded_at',
    ];

    protected $casts = [
        'rating' => 'integer',
        'status' => ReviewStatus::class,
        'responded_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'moderated_by_admin_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeApproved($query)
    {
        return $query->where('status', ReviewStatus::APPROVED);
    }

    public function scopePending($query)
    {
        return $query->where('status', ReviewStatus::PENDING);
    }
}
