<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\ApplicationStatus;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApplicationRequest;
use App\Models\Application;
use App\Models\Listing;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ApplicationController (Tenant)
 *
 * Handles a tenant's own rental applications.
 * SECURITY: All queries are scoped to the authenticated tenant's ID.
 * Status, landlord_id, and tenant_id are never accepted from the client.
 */
class ApplicationController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService
    ) {}

    /**
     * List all applications submitted by the authenticated tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $applications = Application::where('tenant_id', $request->user()->id)
            ->with(['listing.unit.property', 'listing.primaryPhoto'])
            ->latest('submitted_at')
            ->get();

        return response()->json($applications);
    }

    /**
     * Submit a new application to a listing.
     */
    public function store(StoreApplicationRequest $request): JsonResponse
    {
        // Verification gate: tenant must be identity-verified before applying
        if (! $request->user()->isVerified()) {
            return response()->json([
                'message' => 'You must complete identity verification before applying to a listing.',
            ], 403);
        }

        $listing = Listing::findOrFail($request->listing_id);

        // Verify the listing is publicly available before accepting applications
        if (! $listing->isPublic()) {
            return response()->json([
                'message' => 'This listing is not available for applications',
            ], 422);
        }

        // Prevent duplicate active applications for the same listing
        $existingActive = Application::where('tenant_id', $request->user()->id)
            ->where('listing_id', $listing->id)
            ->active()
            ->exists();

        if ($existingActive) {
            return response()->json([
                'message' => 'You already have an active application for this listing',
            ], 422);
        }

        $application = Application::create([
            'tenant_id' => $request->user()->id,
            'listing_id' => $listing->id,
            'landlord_id' => $listing->landlord_id,
            'status' => ApplicationStatus::SUBMITTED,
            'cover_note' => $request->cover_note,
            'submitted_at' => now(),
        ]);

        $this->auditService->log(
            actor: $request->user(),
            action: 'application_submitted',
            subject: $application,
            description: "Tenant submitted application for listing {$listing->id}",
            severity: 'info'
        );

        // Notify the landlord that a new application has been submitted
        $eventId = "application-submitted:{$application->id}";
        if (! $this->notificationService->exists($listing->landlord, $eventId)) {
            $applicantName = $request->user()->full_name ?: $request->user()->email;
            $this->notificationService->create(
                user: $listing->landlord,
                type: NotificationType::APPLICATION_SUBMITTED,
                title: 'New Application Received',
                message: "{$applicantName} has submitted an application for \"{$listing->title}\".",
                data: [
                    'event_id' => $eventId,
                    'application_id' => $application->id,
                    'listing_id' => $listing->id,
                    'listing_title' => $listing->title,
                    'applicant_id' => $request->user()->id,
                    'applicant_name' => $applicantName,
                ]
            );
        }

        return response()->json(
            $application->load(['listing.unit.property', 'listing.primaryPhoto']),
            201
        );
    }

    /**
     * Display a single application belonging to the authenticated tenant (or their landlord).
     */
    public function show(Request $request, Application $application): JsonResponse
    {
        $this->authorize('view', $application);

        return response()->json(
            $application->load(['listing.unit.property', 'listing.primaryPhoto'])
        );
    }

    /**
     * Withdraw an active application.
     */
    public function withdraw(Request $request, Application $application): JsonResponse
    {
        $this->authorize('withdraw', $application);

        $application->status = ApplicationStatus::WITHDRAWN;
        $application->withdrawn_at = now();
        $application->save();

        $this->auditService->log(
            actor: $request->user(),
            action: 'application_withdrawn',
            subject: $application,
            description: "Tenant withdrew application {$application->id}",
            severity: 'info'
        );

        return response()->json($application->fresh());
    }
}
