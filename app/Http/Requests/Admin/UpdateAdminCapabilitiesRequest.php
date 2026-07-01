<?php

namespace App\Http\Requests\Admin;

use App\Enums\AdminCapability;
use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminCapabilitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof Admin && $this->user()->is_super_admin;
    }

    public function rules(): array
    {
        return [
            // present() allows an empty array (revoke everything) but requires the key.
            'capabilities' => ['present', 'array'],
            'capabilities.*' => ['string', Rule::in(AdminCapability::values())],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }
}
