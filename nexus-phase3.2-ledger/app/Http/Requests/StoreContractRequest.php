<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Enums\BillingCycle;

/**
 * StoreContractRequest
 * 
 * Validates contract creation by landlord.
 */
class StoreContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Contract::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'listing_id' => ['required', 'uuid', 'exists:listings,id'],
            'tenant_id' => ['required', 'uuid', 'exists:users,id'],
            'rent_amount' => ['required', 'integer', 'min:0', 'max:9999999999'], // Max ~$99M in cents
            'currency' => ['sometimes', 'string', 'size:3', 'uppercase'],
            'billing_cycle' => ['sometimes', Rule::enum(BillingCycle::class)],
            'payment_day' => ['required', 'integer', 'min:1', 'max:28'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_day.min' => 'Payment day must be between 1 and 28',
            'payment_day.max' => 'Payment day must be between 1 and 28',
            'start_date.after_or_equal' => 'Start date cannot be in the past',
            'end_date.after' => 'End date must be after start date',
        ];
    }

    public function attributes(): array
    {
        return [
            'listing_id' => 'listing',
            'tenant_id' => 'tenant',
            'rent_amount' => 'rent amount',
            'payment_day' => 'payment day',
            'start_date' => 'start date',
            'end_date' => 'end date',
        ];
    }
}
