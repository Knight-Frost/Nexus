<?php

namespace App\Http\Requests\Admin;

use App\Enums\AdminCapability;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shared request for the sensitive, super-admin-only team actions that require
 * a reason (promote, demote, deactivate, revoke invite). Demote may optionally
 * carry the scoped capabilities to leave the admin with.
 */
class AdminAccessActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof Admin && $this->user()->is_super_admin;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
            'capabilities' => ['sometimes', 'array'],
            'capabilities.*' => ['string', Rule::in(AdminCapability::values())],
        ];
    }
}
