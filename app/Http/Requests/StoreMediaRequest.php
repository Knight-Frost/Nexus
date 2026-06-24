<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreMediaRequest
 *
 * Validates a media file upload.
 * Authorization (resource ownership) is enforced in the controller via Policy;
 * this request simply validates the file itself and optional metadata fields.
 */
class StoreMediaRequest extends FormRequest
{
    /**
     * Authorisation is handled by the controller's $this->authorize() call.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $mimes = config('media.allowed_mimes', 'jpg,jpeg,png,webp');
        $maxKb = (int) config('media.max_size_kb', 8192);

        return [
            'file' => [
                'required',
                'file',
                'image',
                "mimes:{$mimes}",
                "max:{$maxKb}",
            ],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
