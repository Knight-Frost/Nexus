<?php

namespace App\Services;

use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * MessageAttachmentService
 *
 * Handles storing uploaded files as MessageAttachment records.
 *
 * SECURITY:
 * - Files are stored on the PRIVATE 'local' disk — never 'public'.
 * - stored_path and disk are hidden on the model; they never appear in JSON.
 * - File type detection uses both extension whitelist (mimes:) and MIME sniffing
 *   (mimetypes:) enforced at the FormRequest layer before this service is called.
 */
class MessageAttachmentService
{
    /**
     * Store a set of uploaded files and link them to the given Message.
     * Updates message.has_attachments = true when at least one file is stored.
     *
     * @param  UploadedFile[]  $files
     */
    public function storeFor(Message $message, array $files): void
    {
        $created = false;

        foreach ($files as $file) {
            /** @var UploadedFile $file */
            $ext = $file->getClientOriginalExtension() ?: $file->extension();
            $path = Storage::disk('local')->putFileAs(
                'message-attachments/'.$message->conversation_id,
                $file,
                Str::uuid().'.'.$ext
            );

            $mimeType = $file->getMimeType();

            MessageAttachment::create([
                'message_id' => $message->id,
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $path,
                'disk' => 'local',
                'mime_type' => $mimeType,
                'size_bytes' => $file->getSize(),
                'attachment_type' => str_starts_with($mimeType, 'image/') ? 'image' : 'file',
            ]);

            $created = true;
        }

        if ($created) {
            $message->has_attachments = true;
            $message->save();
        }
    }
}
