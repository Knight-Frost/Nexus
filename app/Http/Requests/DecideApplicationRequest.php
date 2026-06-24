<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * DecideApplicationRequest
 *
 * Validates a landlord's decision (approve or reject) on an application.
 * SECURITY: Authorization is deferred to the controller which calls
 * $this->authorize('decide', $application) after route-model binding resolves
 * the application, so the policy can check landlord ownership.
 */
class DecideApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is performed in the controller via policy after
        // the route-model-bound Application is available.
        return true;
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:approved,rejected'],
            'decision_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'decision' => 'decision',
            'decision_reason' => 'decision reason',
        ];
    }
}
