<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ContractStatus;
use App\Enums\NotificationType;
use App\Enums\TerminatedBy;
use App\Http\Controllers\Controller;
use App\Http\Requests\AdminTerminateContractRequest;
use App\Models\Contract;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AdminContractController
 *
 * Handles admin contract operations.
 */
class AdminContractController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Display all contracts
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'string'],
            // why: landlord_id/tenant_id are bigint users.id FKs, not UUIDs — validating as
            // uuid silently rejected every real value, so the filter never matched. (June 2026)
            'landlord_id' => ['sometimes', 'integer'],
            'tenant_id' => ['sometimes', 'integer'],
        ]);

        $query = Contract::with(['listing', 'landlord', 'tenant', 'admin'])
            ->orderBy('created_at', 'desc');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['landlord_id'])) {
            $query->where('landlord_id', $filters['landlord_id']);
        }

        if (! empty($filters['tenant_id'])) {
            $query->where('tenant_id', $filters['tenant_id']);
        }

        $contracts = $query->paginate(50);

        return response()->json($contracts);
    }

    /**
     * Display the specified contract
     */
    public function show(Contract $contract): JsonResponse
    {
        return response()->json($contract->load(['listing.unit.property', 'landlord', 'tenant', 'admin']));
    }

    /**
     * Force terminate contract (admin only)
     */
    public function terminate(AdminTerminateContractRequest $request, Contract $contract): JsonResponse
    {
        if (! $contract->canBeTerminated()) {
            return response()->json([
                'message' => 'Only active contracts can be terminated',
            ], 422);
        }

        $contract->update([
            'status' => ContractStatus::TERMINATED,
            'terminated_by' => TerminatedBy::ADMIN,
            'termination_reason' => $request->reason,
            'admin_id' => $request->user()->id,
        ]);

        // Audit log (critical - admin forced termination)
        $this->auditService->log(
            actor: $request->user(),
            action: 'contract_force_terminated',
            subject: $contract,
            description: 'Admin force terminated contract',
            severity: 'critical'
        );

        // Notify both parties of admin-forced termination
        $reason = $request->reason;

        $tenantEventId = "contract-terminated:{$contract->id}:tenant";
        if (! $this->notificationService->exists($contract->tenant, $tenantEventId)) {
            $this->notificationService->create(
                user: $contract->tenant,
                type: NotificationType::CONTRACT_TERMINATED,
                title: 'Contract Terminated',
                message: "Your contract for \"{$contract->listing->title}\" has been terminated by the platform. Reason: {$reason}",
                data: [
                    'event_id' => $tenantEventId,
                    'contract_id' => $contract->id,
                    'terminated_by' => 'admin',
                    'reason' => $reason,
                ]
            );
        }

        $landlordEventId = "contract-terminated:{$contract->id}:landlord";
        if (! $this->notificationService->exists($contract->landlord, $landlordEventId)) {
            $this->notificationService->create(
                user: $contract->landlord,
                type: NotificationType::CONTRACT_TERMINATED,
                title: 'Contract Terminated',
                message: "The contract for \"{$contract->listing->title}\" has been terminated by the platform. Reason: {$reason}",
                data: [
                    'event_id' => $landlordEventId,
                    'contract_id' => $contract->id,
                    'terminated_by' => 'admin',
                    'reason' => $reason,
                ]
            );
        }

        return response()->json([
            'message' => 'Contract terminated by admin',
            'contract' => $contract->fresh(),
        ]);
    }
}
