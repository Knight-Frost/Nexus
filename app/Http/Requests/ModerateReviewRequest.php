<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * ModerateReviewRequest
 *
 * Validates an admin's moderation action on a review.
 */
class ModerateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof \App\Models\Admin;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', 'string', 'in:approve,reject,hide,flag'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
