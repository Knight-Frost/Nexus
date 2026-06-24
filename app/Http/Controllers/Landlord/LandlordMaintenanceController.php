<?php

namespace App\Http\Controllers\Landlord;

use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMaintenanceStatusRequest;
use App\Models\MaintenanceRequest;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * LandlordMaintenanceController
 *
 * Allows landlords to list and update the status of maintenance requests
 * filed against their properties.
 */
class LandlordMaintenanceController extends Controller
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    /**
     * List maintenance requests for the authenticated landlord's properties.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MaintenanceRequest::class);

        $requests = MaintenanceRequest::where('landlord_id', $request->user()->id)
            ->with(['tenant', 'property', 'unit'])
            ->latest('submitted_at')
            ->get();

        return response()->json($requests);
    }

    /**
     * Update the status of a maintenance request.
     *
     * Stamps the appropriate lifecycle timestamp when the status changes.
     * Resolution notes are stored when provided.
     */
    public function updateStatus(
        UpdateMaintenanceStatusRequest $request,
        MaintenanceRequest $maintenanceRequest
    ): JsonResponse {
        $this->authorize('updateStatus', $maintenanceRequest);

        $validated = $request->validated();
        $newStatus = MaintenanceStatus::from($validated['status']);

        $maintenanceRequest->status = $newStatus;

        // Stamp the appropriate lifecycle timestamp
        match ($newStatus) {
            MaintenanceStatus::ACKNOWLEDGED => $maintenanceRequest->acknowledged_at = now(),
            MaintenanceStatus::IN_PROGRESS => $maintenanceRequest->acknowledged_at ??= now(),
            MaintenanceStatus::RESOLVED => $maintenanceRequest->resolved_at = now(),
            MaintenanceStatus::CLOSED => $maintenanceRequest->closed_at = now(),
            MaintenanceStatus::CANCELLED => $maintenanceRequest->closed_at = now(),
            default => null,
        };

        if (isset($validated['resolution_notes'])) {
            $maintenanceRequest->resolution_notes = $validated['resolution_notes'];
        }

        $maintenanceRequest->save();

        $this->auditService->log(
            actor: $request->user(),
            action: 'maintenance_status_updated',
            subject: $maintenanceRequest,
            description: "Maintenance request status updated to '{$newStatus->value}': {$maintenanceRequest->title}",
            metadata: ['new_status' => $newStatus->value],
            severity: 'info'
        );

        return response()->json($maintenanceRequest);
    }
}
