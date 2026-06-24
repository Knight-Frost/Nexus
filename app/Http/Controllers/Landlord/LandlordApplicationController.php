<?php

namespace App\Http\Controllers\Landlord;

use App\Enums\ApplicationStatus;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\DecideApplicationRequest;
use App\Models\Application;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Services\TenantReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * LandlordApplicationController
 *
 * Handles a landlord's view of applications directed at their listings.
 * SECURITY: All queries are scoped to the authenticated landlord's ID.
 * landlord_notes is hidden on the model but made visible here because this
 * controller is exclusively landlord-facing.
 */
class LandlordApplicationController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected TenantReadinessService $readinessService,
        protected NotificationService $notificationService
    ) {}

    /**
     * List all applications for the authenticated landlord's listings.
     */
    public function index(Request $request): JsonResponse
    {
        $applications = Application::where('landlord_id', $request->user()->id)
            ->with(['tenant', 'listing.unit.property'])
            ->latest()
            ->get();

        // Landlords may see their own internal notes
        $applications->each->makeVisible('landlord_notes');

        $payload = $applications->map(fn (Application $application) => $this->withReadiness($application));

        return response()->json($payload);
    }

    /**
     * Display a single application (landlord must own the listing).
     */
    public function show(Request $request, Application $application): JsonResponse
    {
        $this->authorize('view', $application);

        $application->makeVisible('landlord_notes');
        $application->load(['tenant', 'listing.unit.property']);

        return response()->json($this->withReadiness($application));
    }

    /**
     * Approve or reject an application.
     */
    public function decide(DecideApplicationRequest $request, Application $application): JsonResponse
    {
        $this->authorize('decide', $application);

        $decision = $request->decision; // 'approved' or 'rejected'

        $application->status = ApplicationStatus::from($decision);
        $application->decided_at = now();
        $application->reviewed_at = $application->reviewed_at ?? now();
        $application->decision_reason = $request->decision_reason;
        $application->save();

        $this->auditService->log(
            actor: $request->user(),
            action: 'application_decided',
            subject: $application,
            description: "Landlord {$decision} application {$application->id}",
            metadata: ['decision' => $decision],
            severity: 'info'
        );

        // Notify the tenant of the decision
        $eventId = "application-decided:{$application->id}";
        $notificationType = $decision === 'approved'
            ? NotificationType::APPLICATION_APPROVED
            : NotificationType::APPLICATION_REJECTED;

        $listing = $application->listing;
        $decisionLabel = $decision === 'approved' ? 'approved' : 'rejected';
        $listingTitle = $listing?->title ?? 'your application';
        $reason = $request->decision_reason;

        $message = "Your application for \"{$listingTitle}\" has been {$decisionLabel}.";
        if ($reason) {
            $message .= " Reason: {$reason}";
        }

        if (! $this->notificationService->exists($application->tenant, $eventId)) {
            $this->notificationService->create(
                user: $application->tenant,
                type: $notificationType,
                title: 'Application '.ucfirst($decisionLabel),
                message: $message,
                data: [
                    'event_id' => $eventId,
                    'application_id' => $application->id,
                    'listing_id' => $listing?->id,
                    'listing_title' => $listingTitle,
                    'decision' => $decision,
                    'decision_reason' => $reason,
                ]
            );
        }

        $fresh = $application->fresh()->makeVisible('landlord_notes');
        $fresh->load(['tenant', 'listing.unit.property']);

        return response()->json($this->withReadiness($fresh));
    }

    /**
     * Serialize an application and attach the tenant's rental-readiness summary.
     *
     * The readiness key is merged into the array form so it survives JSON
     * serialization regardless of the model's hidden/appends config.
     */
    private function withReadiness(Application $application): array
    {
        return array_merge(
            $application->toArray(),
            ['readiness' => $this->readinessService->compute($application->tenant)]
        );
    }
}
