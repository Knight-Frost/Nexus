<?php

namespace App\Http\Requests\Admin;

use App\Enums\AdminCapability;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Inviting an admin is a super-admin-only action. authorize() is the security
 * gate — a regular admin with manage_access clears the route middleware but is
 * rejected here.
 */
class InviteAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof Admin && $this->user()->is_super_admin;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_super_admin' => ['sometimes', 'boolean'],
            'capabilities' => ['sometimes', 'array'],
            'capabilities.*' => ['string', Rule::in(AdminCapability::values())],
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
