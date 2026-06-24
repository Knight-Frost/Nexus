<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Requests\RespondToReviewRequest;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * LandlordReviewController
 *
 * Lists approved reviews on the landlord's properties and handles landlord responses.
 */
class LandlordReviewController extends Controller
{
    public function __construct(
        protected ReviewService $reviewService
    ) {}

    /**
     * List approved reviews for the authenticated landlord's properties,
     * along with a per-property rating summary.
     */
    public function index(Request $request): JsonResponse
    {
        $landlordId = $request->user()->id;

        $reviews = Review::where('landlord_id', $landlordId)
            ->where('status', \App\Enums\ReviewStatus::APPROVED)
            ->with(['reviewer', 'property'])
            ->latest()
            ->get();

        // Aggregate rating summary per property
        $summary = Review::where('landlord_id', $landlordId)
            ->where('status', \App\Enums\ReviewStatus::APPROVED)
            ->selectRaw('property_id, AVG(rating) as average_rating, COUNT(*) as review_count')
            ->groupBy('property_id')
            ->get()
            ->keyBy('property_id');

        return response()->json([
            'reviews' => $reviews,
            'summary' => $summary->values(),
        ]);
    }

    /**
     * Landlord response to an approved review on their property.
     */
    public function respond(RespondToReviewRequest $request, Review $review): JsonResponse
    {
        try {
            $updated = $this->reviewService->respond(
                review: $review,
                landlord: $request->user(),
                text: $request->response
            );
        } catch (AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'Only approved reviews can receive a response.', 'errors' => $e->errors()], 422);
        }

        return response()->json($updated->load(['reviewer', 'property']));
    }
}
