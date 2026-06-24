<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * RespondToReviewRequest
 *
 * Validates a landlord's response to an approved review.
 */
class RespondToReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isLandlord() ?? false;
    }

    public function rules(): array
    {
        return [
            'response' => ['required', 'string', 'max:2000'],
        ];
    }
}
