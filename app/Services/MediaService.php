<?php

namespace App\Services;

use App\Enums\MediaVisibility;
use App\Models\MediaAsset;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * MediaService
 *
 * Handles file storage, metadata persistence, and lifecycle for MediaAssets.
 *
 * Design principle: swapping from local → S3/R2 is a single env-var change
 * (MEDIA_DISK_PUBLIC / MEDIA_DISK_PRIVATE). No code changes required.
 */
class MediaService
{
    public function __construct(private readonly AuditService $audit) {}

    /**
     * Store an uploaded file and persist its MediaAsset record.
     *
     * @param  UploadedFile  $file  The validated upload.
     * @param  string  $collection  MediaCollection enum value.
     * @param  Model|null  $attachable  Polymorphic resource this belongs to.
     * @param  Model  $uploader  Who clicked "upload" (User or Admin).
     * @param  Model|null  $owner  Subject who owns the asset (may equal $uploader).
     * @param  string  $visibility  MediaVisibility enum value.
     */
    public function store(
        UploadedFile $file,
        string $collection,
        ?Model $attachable,
        Model $uploader,
        ?Model $owner,
        string $visibility = 'public',
    ): MediaAsset {
        $vis = MediaVisibility::from($visibility);
        $disk = $vis === MediaVisibility::Public
            ? config('media.disk_public', 'public')
            : config('media.disk_private', 'local');

        $ext = strtolower($file->getClientOriginalExtension());
        $storedFilename = Str::uuid().'.'.$ext;

        // Compute checksum before moving (stream-safe)
        $checksum = hash('sha256', file_get_contents($file->getRealPath()));

        // Determine sort_order (max within same attachable+collection, then +1)
        $sortOrder = 0;
        if ($attachable) {
            $existing = MediaAsset::where('attachable_type', get_class($attachable))
                ->where('attachable_id', $attachable->getKey())
                ->where('collection', $collection)
                ->where('status', 'active')
                ->max('sort_order');

            $sortOrder = ($existing === null) ? 0 : (int) $existing + 1;
        }

        // Build storage path: {collection}/{owner_id}/{stored_filename}
        $ownerId = $owner?->getKey() ?? $uploader->getKey();
        $path = "{$collection}/{$ownerId}/{$storedFilename}";

        Storage::disk($disk)->putFileAs(
            "{$collection}/{$ownerId}",
            $file,
            $storedFilename
        );

        $asset = MediaAsset::create([
            'owner_user_id' => $owner?->getKey(),
            'uploaded_by_id' => $uploader->getKey(),
            'attachable_type' => $attachable ? get_class($attachable) : null,
            'attachable_id' => $attachable?->getKey(),
            'collection' => $collection,
            'disk' => $disk,
            'path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $storedFilename,
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'extension' => $ext ?: null,
            'size_bytes' => $file->getSize(),
            'checksum' => $checksum,
            'visibility' => $visibility,
            'sort_order' => $sortOrder,
            'status' => 'active',
        ]);

        $this->audit->log(
            actor: $uploader,
            action: 'media_uploaded',
            subject: $asset,
            description: "Media uploaded: {$file->getClientOriginalName()}",
            metadata: [
                'collection' => $collection,
                'size_bytes' => $file->getSize(),
                'mime_type' => $asset->mime_type,
            ],
            severity: 'info'
        );

        return $asset;
    }

    /**
     * Archive a media asset and remove its physical file from disk.
     *
     * Sets status=archived, soft-deletes the record, removes the file.
     * Order: archive first (preserves audit row even if Storage::delete fails).
     */
    public function delete(MediaAsset $asset, Model $actor): void
    {
        // Capture before soft-delete removes disk/path from DB visibility
        $disk = $asset->disk;
        $path = $asset->path;

        $asset->update(['status' => 'archived']);
        $asset->delete();

        if (Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->delete($path);
        }

        $this->audit->log(
            actor: $actor,
            action: 'media_deleted',
            subject: $asset,
            description: "Media deleted: {$asset->original_filename}",
            metadata: ['collection' => $asset->collection],
            severity: 'info'
        );
    }

    /**
     * Update sort_order for a set of media assets.
     *
     * Accepts an ordered array of UUID strings; assigns sort_order 0, 1, 2...
     * Only assets whose UUIDs appear in the array are updated (idempotent).
     */
    public function reorder(array $idsInOrder): void
    {
        foreach ($idsInOrder as $index => $id) {
            MediaAsset::where('id', $id)->update(['sort_order' => $index]);
        }
    }
}
