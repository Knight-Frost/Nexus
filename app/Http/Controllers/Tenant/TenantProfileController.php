<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTenantProfileRequest;
use App\Services\AuditService;
use App\Services\TenantReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * TenantProfileController
 *
 * Real, authenticated tenant profile + computed readiness. No hardcoded
 * completion percentages or checklist states — readiness is computed from
 * actual columns and uploaded documents.
 */
class TenantProfileController extends Controller
{
    public function show(Request $request, TenantReadinessService $readiness): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->presentUser($user),
            'readiness' => $readiness->compute($user),
        ]);
    }

    public function update(
        UpdateTenantProfileRequest $request,
        TenantReadinessService $readiness,
        AuditService $audit,
    ): JsonResponse {
        $user = $request->user();
        $original = $user->only(array_keys($request->validated()));

        $user->update($request->validated());

        $audit->log(
            actor: $user,
            action: 'tenant_profile_updated',
            subject: $user,
            description: 'Tenant updated their profile details',
            oldValues: $original,
            newValues: $request->validated(),
            severity: 'info',
        );

        return response()->json([
            'user' => $this->presentUser($user->fresh()),
            'readiness' => $readiness->compute($user->fresh()),
        ]);
    }

    /**
     * Build the safe display payload. Sensitive/privileged columns are never
     * included; full_name + initials are appended for the UI.
     */
    private function presentUser($user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->full_name,
            'initials' => $user->initials,
            'email' => $user->email,
            'phone' => $user->phone,
            'city' => $user->city,
            'date_of_birth' => $user->date_of_birth?->toDateString(),
            'next_of_kin_name' => $user->next_of_kin_name,
            'next_of_kin_phone' => $user->next_of_kin_phone,
            'next_of_kin_relationship' => $user->next_of_kin_relationship,
            'user_type' => $user->user_type->value,
            'identity_verified' => $user->identity_verified,
            'created_at' => $user->created_at?->toISOString(),
        ];
    }
}
