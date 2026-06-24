<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\MessageAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * MessageAttachmentController (Tenant)
 *
 * Streams a message attachment after verifying the requester is a conversation participant.
 *
 * SECURITY:
 * - Files are stored on the PRIVATE 'local' disk — no public URL is generated.
 * - Participant membership is verified before any file access.
 * - stored_path / disk are never returned in JSON; the file is piped directly.
 */
class MessageAttachmentController extends Controller
{
    public function show(Request $request, MessageAttachment $attachment): StreamedResponse|\Illuminate\Http\JsonResponse
    {
        $conversation = $attachment->message->conversation;

        if (! $conversation->hasParticipant($request->user())) {
            abort(403);
        }

        if (! Storage::disk($attachment->disk)->exists($attachment->stored_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return Storage::disk($attachment->disk)->response(
            $attachment->stored_path,
            $attachment->original_name,
            ['Content-Type' => $attachment->mime_type]
        );
    }
}
