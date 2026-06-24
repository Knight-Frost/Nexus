<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StartConversationRequest
 *
 * Validates the payload for POST /api/tenant/conversations.
 * Authorization is always true here; the controller checks business rules
 * (self-messaging, listing ownership, landlord resolution).
 *
 * Either body or at least one attachment must be provided (required_without).
 */
class StartConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'listing_id' => ['required', 'exists:listings,id'],
            'body' => ['nullable', 'string', 'max:2000', 'required_without:attachments'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => [
                'file',
                'max:10240',
                'mimes:jpg,jpeg,png,webp,gif,pdf,doc,docx,txt,csv,xls,xlsx',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required_without' => 'Enter a message or attach at least one file.',
            'attachments.max' => 'You can attach up to 5 files per message.',
            'attachments.*.max' => 'Each file must be 10 MB or smaller.',
            'attachments.*.mimes' => 'That file type is not allowed.',
            'attachments.*.mimetypes' => 'That file type is not allowed.',
        ];
    }
}
