<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreApplicationRequest
 *
 * Validates a tenant's request to submit a rental application.
 * SECURITY: status, landlord_id, and tenant_id are never accepted from the
 * client — they are derived server-side from the listing and authenticated user.
 */
class StoreApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Application::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'listing_id' => ['required', 'exists:listings,id'],
            'cover_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'listing_id' => 'listing',
            'cover_note' => 'cover note',
        ];
    }
}
