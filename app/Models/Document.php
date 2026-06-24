<?php

namespace App\Models;

use App\Enums\DocumentType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Document
 *
 * Represents a file uploaded by or on behalf of a user.
 *
 * SECURITY:
 * - stored_path and disk are in $hidden so they are NEVER serialised to JSON.
 * - Downloads must go through DocumentController::download(), which enforces
 *   the DocumentPolicy before streaming the file from the private 'local' disk.
 * - No public URLs or signed paths are ever exposed.
 */
class Document extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'owner_user_id',
        'uploaded_by_id',
        'document_type',
        'original_filename',
        'stored_path',
        'disk',
        'mime_type',
        'size_bytes',
        'verified_at',
        'related_type',
        'related_id',
    ];

    /**
     * SECURITY: stored_path and disk must never appear in JSON responses.
     * The controller streams files after a policy check; paths are internal.
     *
     * @var list<string>
     */
    protected $hidden = [
        'stored_path',
        'disk',
    ];

    protected $casts = [
        'document_type' => DocumentType::class,
        'verified_at' => 'datetime',
        'size_bytes' => 'integer',
    ];

    /**
     * Append computed attributes to JSON output.
     *
     * @var list<string>
     */
    protected $appends = ['is_verified'];

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Whether the document has been verified by an admin or the system.
     */
    public function getIsVerifiedAttribute(): bool
    {
        return $this->verified_at !== null;
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The user who owns this document.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /**
     * The user who uploaded this document (may differ from owner in future).
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }

    /**
     * Optional polymorphic link to the entity this document was attached to
     * (e.g. Application, MaintenanceRequest, Contract).
     */
    public function related(): MorphTo
    {
        return $this->morphTo();
    }
}
