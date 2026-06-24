<?php

namespace App\Http\Requests;

use App\Enums\ReviewStatus;
use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateReviewRequest
 *
 * Validates a tenant's edit to their own pending review.
 */
class UpdateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        $review = $this->route('review');

        return $this->user()?->isTenant()
            && $review
            && (int) $review->reviewer_user_id === (int) $this->user()->id
            && $review->status === ReviewStatus::PENDING;
    }

    public function rules(): array
    {
        return [
            'rating' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['sometimes', 'string', 'max:2000'],
        ];
    }
}
