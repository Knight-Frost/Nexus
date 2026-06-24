<?php

namespace App\Models;

use App\Enums\MediaCollection;
use App\Enums\MediaVisibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

/**
 * MediaAsset Model
 *
 * Stores metadata for uploaded media files (images, etc.) with polymorphic
 * attachment support. Coexists with ListingPhoto; planned future consolidation.
 *
 * SECURITY:
 * - `path` and `disk` are in $hidden so they are NEVER serialised to JSON.
 * - Public assets expose a Storage URL; private/restricted assets are served
 *   through the controlled GET /media/{mediaAsset} route (name: media.show)
 *   which enforces MediaAssetPolicy::view() before streaming.
 *
 * TODO (future): consolidate ListingPhoto into media_assets and migrate existing
 * records. Not done now to avoid breaking the existing listing photo tests/seeder.
 */
class MediaAsset extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'owner_user_id',
        'uploaded_by_id',
        'attachable_type',
        'attachable_id',
        'collection',
        'disk',
        'path',
        'original_filename',
        'stored_filename',
        'mime_type',
        'extension',
        'size_bytes',
        'checksum',
        'visibility',
        'sort_order',
        'alt_text',
        'caption',
        'status',
    ];

    /**
     * SECURITY: path and disk must never appear in JSON responses.
     * Serving is done through the policy-gated media.show route.
     *
     * @var list<string>
     */
    protected $hidden = [
        'path',
        'disk',
    ];

    protected $casts = [
        'collection' => MediaCollection::class,
        'visibility' => MediaVisibility::class,
        'size_bytes' => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * Computed attributes to include in JSON output.
     *
     * @var list<string>
     */
    protected $appends = ['url'];

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Return a URL appropriate for the asset's visibility level.
     *
     * Public  → direct Storage URL (publicly accessible).
     * Private / Restricted → the controlled media.show route so the policy
     *   check fires before any bytes are served.
     */
    public function getUrlAttribute(): ?string
    {
        if ($this->visibility === MediaVisibility::Public) {
            return Storage::disk($this->disk)->url($this->path);
        }

        // Private or restricted: serve via controlled route
        if ($this->id) {
            return route('media.show', $this->id);
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The polymorphic resource this asset is attached to
     * (Property, Unit, Listing, MaintenanceRequest, User, etc.).
     */
    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * The user who owns this asset (the subject — e.g. the landlord who owns the property).
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /**
     * The user who uploaded this asset (may differ from owner).
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Order by sort_order ascending.
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order');
    }

    /**
     * Only active (non-archived) assets.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
