<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateTenantProfileRequest
 *
 * SECURITY: Whitelists ONLY tenant-editable display/contact fields. Privileged
 * fields (user_type, identity_verified, is_active, email, password) are
 * deliberately absent, so even a crafted payload cannot escalate or self-verify
 * — the controller only persists $request->validated().
 */
class UpdateTenantProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) ($this->user()?->isTenant() ?? false);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'string', 'max:80'],
            'last_name' => ['sometimes', 'string', 'max:80'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'next_of_kin_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'next_of_kin_phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'next_of_kin_relationship' => ['sometimes', 'nullable', 'string', 'max:60'],
        ];
    }
}
