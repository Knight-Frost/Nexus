<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceCategory;
use App\Enums\MaintenancePriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreMaintenanceRequest
 *
 * Validates tenant submission of a new maintenance request.
 * Authorization: only tenants may call this endpoint (enforced via policy).
 * Active-lease enforcement happens in the controller after this request passes.
 */
class StoreMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\MaintenanceRequest::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'contract_id' => ['required', 'exists:contracts,id'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['required', 'string', 'max:2000'],
            'category' => ['required', Rule::enum(MaintenanceCategory::class)],
            'priority' => ['required', Rule::enum(MaintenancePriority::class)],
        ];
    }

    public function attributes(): array
    {
        return [
            'contract_id' => 'contract',
            'title' => 'title',
            'description' => 'description',
            'category' => 'category',
            'priority' => 'priority',
        ];
    }
}
