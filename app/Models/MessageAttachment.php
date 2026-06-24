<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * MessageAttachment
 *
 * Represents a file attached to a Message.
 *
 * SECURITY:
 * - stored_path and disk are in $hidden so they are NEVER serialised to JSON.
 * - Downloads must go through MessageAttachmentController::show(), which enforces
 *   participant membership before streaming the file from the private 'local' disk.
 * - No public URLs or signed paths are ever exposed.
 */
class MessageAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'original_name',
        'stored_path',
        'disk',
        'mime_type',
        'size_bytes',
        'attachment_type',
    ];

    /**
     * SECURITY: stored_path and disk must never appear in JSON responses.
     *
     * @var list<string>
     */
    protected $hidden = ['stored_path', 'disk'];

    protected $casts = ['size_bytes' => 'integer'];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * Returns the safe metadata array for JSON responses.
     * Never includes stored_path or disk.
     */
    public function toMetaArray(): array
    {
        return [
            'id' => $this->id,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'attachment_type' => $this->attachment_type,
        ];
    }
}
