<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ModerateReviewRequest;
use App\Models\Admin;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AdminReviewController
 *
 * Admin moderation queue for reviews.
 */
class AdminReviewController extends Controller
{
    public function __construct(
        protected ReviewService $reviewService
    ) {}

    /**
     * List reviews pending moderation (pending + flagged), filterable by status.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:pending,approved,rejected,hidden,flagged'],
            'property_id' => ['nullable', 'integer', 'exists:properties,id'],
        ]);

        $query = Review::with(['reviewer', 'property', 'moderator'])
            ->latest();

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        } else {
            // Default: show the moderation queue (pending + flagged)
            $query->whereIn('status', [ReviewStatus::PENDING->value, ReviewStatus::FLAGGED->value]);
        }

        if (isset($validated['property_id'])) {
            $query->where('property_id', $validated['property_id']);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Moderate a review: approve, reject, hide, or flag.
     */
    public function moderate(ModerateReviewRequest $request, Review $review): JsonResponse
    {
        /** @var Admin $admin */
        $admin = $request->user();

        try {
            $updated = $this->reviewService->moderate(
                review: $review,
                admin: $admin,
                action: $request->action,
                reason: $request->reason
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($updated->load(['reviewer', 'property', 'moderator']));
    }
}
