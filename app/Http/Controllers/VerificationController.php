<?php

namespace App\Http\Controllers;

use App\Exceptions\VerificationException;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function __construct(
        protected VerificationService $verificationService
    ) {}

    /**
     * Get the authenticated user's current verification status.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $latest = $user->latestVerificationRequest;

        return response()->json([
            'verification_status' => $user->verification_status?->value ?? $user->verification_status,
            'identity_verified' => $user->identity_verified,
            'latest_request' => $latest,
        ]);
    }

    /**
     * Submit a verification request.
     */
    public function submit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $req = $this->verificationService->submit(
                user: $request->user(),
                note: $validated['note'] ?? null
            );

            return response()->json([
                'message' => 'Verification request submitted successfully.',
                'verification_request' => $req,
            ], 201);
        } catch (VerificationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
