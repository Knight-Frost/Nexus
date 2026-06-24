<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * UpdateMaintenanceStatusRequest
 *
 * Validates a landlord's status update on a maintenance request.
 * Authorization is performed in the controller via the policy
 * (updateStatus gate), so authorize() returns true here.
 */
class UpdateMaintenanceStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Controller performs authorization via $this->authorize('updateStatus', $maintenanceRequest)
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(MaintenanceStatus::class)],
            'resolution_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'status' => 'status',
            'resolution_notes' => 'resolution notes',
        ];
    }
}
