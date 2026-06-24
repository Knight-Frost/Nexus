<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\ContractStatus;
use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceRequest;
use App\Models\Contract;
use App\Models\MaintenanceRequest;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * MaintenanceRequestController (Tenant)
 *
 * Allows tenants to file, view, and cancel maintenance requests
 * against their active leases.
 */
class MaintenanceRequestController extends Controller
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    /**
     * List the authenticated tenant's maintenance requests.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MaintenanceRequest::class);

        $requests = MaintenanceRequest::where('tenant_id', $request->user()->id)
            ->with(['property', 'unit', 'contract'])
            ->latest('submitted_at')
            ->get();

        return response()->json($requests);
    }

    /**
     * File a new maintenance request.
     *
     * The contract must belong to this tenant AND be ACTIVE.
     * Property, unit, and landlord IDs are derived from the contract —
     * the client never supplies them directly.
     */
    public function store(StoreMaintenanceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Load contract and verify tenant ownership
        $contract = Contract::find($validated['contract_id']);

        if ((int) $contract->tenant_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Enforce active-lease constraint
        if ($contract->status !== ContractStatus::ACTIVE) {
            return response()->json([
                'message' => 'You can only open maintenance requests against an active lease.',
            ], 422);
        }

        // Derive location/ownership from contract — never trust the client for these
        $unit = $contract->listing->unit;
        $property = $unit->property;

        $maintenanceRequest = MaintenanceRequest::create([
            'tenant_id' => $request->user()->id,
            'contract_id' => $contract->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'landlord_id' => $contract->landlord_id,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'category' => $validated['category'],
            'priority' => $validated['priority'],
            'status' => MaintenanceStatus::OPEN->value,
            'submitted_at' => now(),
        ]);

        $this->auditService->log(
            actor: $request->user(),
            action: 'maintenance_request_created',
            subject: $maintenanceRequest,
            description: "Maintenance request created: {$maintenanceRequest->title}",
            severity: 'info'
        );

        return response()->json(
            $maintenanceRequest->load(['property', 'unit', 'contract']),
            201
        );
    }

    /**
     * Display a specific maintenance request.
     */
    public function show(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $this->authorize('view', $maintenanceRequest);

        return response()->json(
            $maintenanceRequest->load(['property', 'unit', 'contract'])
        );
    }

    /**
     * Cancel an open maintenance request.
     * Only allowed while the status is OPEN.
     */
    public function cancel(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $this->authorize('cancel', $maintenanceRequest);

        $maintenanceRequest->status = MaintenanceStatus::CANCELLED;
        $maintenanceRequest->closed_at = now();
        $maintenanceRequest->save();

        $this->auditService->log(
            actor: $request->user(),
            action: 'maintenance_request_cancelled',
            subject: $maintenanceRequest,
            description: "Maintenance request cancelled: {$maintenanceRequest->title}",
            severity: 'info'
        );

        return response()->json($maintenanceRequest);
    }
}
