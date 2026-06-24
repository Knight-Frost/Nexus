<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewRequest;
use App\Http\Requests\UpdateReviewRequest;
use App\Models\Contract;
use App\Models\Listing;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * ReviewController (Tenant)
 *
 * Handles a tenant's own reviews and eligibility checks.
 * Eligibility (contract ownership + status + no duplicate) is enforced in ReviewService.
 */
class ReviewController extends Controller
{
    public function __construct(
        protected ReviewService $reviewService
    ) {}

    /**
     * List all reviews submitted by the authenticated tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $reviews = Review::where('reviewer_user_id', $request->user()->id)
            ->with(['property', 'contract'])
            ->latest()
            ->get();

        return response()->json($reviews);
    }

    /**
     * Check whether the authenticated tenant may review a given listing.
     *
     * Returns { eligible: bool, contract_id: string|null }
     */
    public function eligibility(Request $request, Listing $listing): JsonResponse
    {
        $property = $listing->unit?->property;

        if (! $property) {
            return response()->json(['eligible' => false, 'contract_id' => null]);
        }

        $contract = $this->reviewService->eligibleContractFor($request->user(), $property);

        return response()->json([
            'eligible' => $contract !== null,
            'contract_id' => $contract?->id,
        ]);
    }

    /**
     * Create a new review.
     */
    public function store(StoreReviewRequest $request): JsonResponse
    {
        $contract = Contract::findOrFail($request->contract_id);

        try {
            $review = $this->reviewService->create(
                tenant: $request->user(),
                contract: $contract,
                rating: (int) $request->rating,
                title: $request->title,
                body: $request->body
            );
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'You are not eligible to review this property.',
                'errors' => $e->errors(),
            ], 403);
        }

        return response()->json($review->load(['property', 'contract']), 201);
    }

    /**
     * Edit a pending review (reviewer only).
     */
    public function update(UpdateReviewRequest $request, Review $review): JsonResponse
    {
        $review->fill($request->only(['rating', 'title', 'body']));
        $review->save();

        return response()->json($review->fresh()->load(['property', 'contract']));
    }
}
