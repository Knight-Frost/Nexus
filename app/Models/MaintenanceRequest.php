<?php

namespace App\Models;

use App\Enums\MaintenanceCategory;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MaintenanceRequest Model
 *
 * Represents a maintenance issue filed by a tenant against an active lease.
 * Property, unit, and landlord IDs are denormalised from the contract at
 * creation time so that list queries do not require joins to contracts.
 */
class MaintenanceRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'contract_id',
        'property_id',
        'unit_id',
        'landlord_id',
        'title',
        'description',
        'category',
        'priority',
        'status',
        'resolution_notes',
        'submitted_at',
        'acknowledged_at',
        'resolved_at',
        'closed_at',
    ];

    protected $casts = [
        'status' => MaintenanceStatus::class,
        'priority' => MaintenancePriority::class,
        'category' => MaintenanceCategory::class,
        'submitted_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    /**
     * Scope: only requests that are not yet in a final state.
     */
    public function scopeOpen($query)
    {
        return $query->whereIn('status', [
            MaintenanceStatus::OPEN->value,
            MaintenanceStatus::ACKNOWLEDGED->value,
            MaintenanceStatus::IN_PROGRESS->value,
        ]);
    }
}
