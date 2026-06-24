<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * SuspendUserRequest
 *
 * Validates an admin's request to suspend a user account.
 */
class SuspendUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Admin guard handles authorization at the route.
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'A reason is required to suspend an account.',
            'reason.min' => 'The suspension reason must be at least 5 characters.',
        ];
    }

    public function attributes(): array
    {
        return [
            'reason' => 'suspension reason',
        ];
    }
}
