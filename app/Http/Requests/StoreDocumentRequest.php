<?php

namespace App\Http\Requests;

use App\Enums\DocumentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreDocumentRequest
 *
 * Validates an incoming document upload.
 *
 * SECURITY:
 * - Only a whitelist of MIME types / extensions is accepted (no PHP, exe, etc.)
 * - Maximum size is 10 MB (10240 KB).
 * - document_type must be a known DocumentType enum value.
 * - All other request fields are implicitly rejected (only 'file' and
 *   'document_type' are declared in rules()).
 */
class StoreDocumentRequest extends FormRequest
{
    /**
     * Determine if the user is authorised to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Document::class) ?? false;
    }

    /**
     * Validation rules.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:10240', // 10 MB in kilobytes
            ],
            'document_type' => [
                'required',
                Rule::enum(DocumentType::class),
            ],
        ];
    }

    /**
     * Human-readable error messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.mimes' => 'The file must be a PDF, JPG, PNG, or WebP image.',
            'file.max' => 'The file may not be larger than 10 MB.',
        ];
    }
}
