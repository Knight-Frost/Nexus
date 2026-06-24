<?php

namespace App\Http\Controllers\Tenant;

use App\Enums\ContractStatus;
use App\Enums\NotificationType;
use App\Enums\TerminatedBy;
use App\Http\Controllers\Controller;
use App\Http\Requests\TerminateContractRequest;
use App\Models\Contract;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * TenantContractController
 *
 * Handles tenant contract operations.
 */
class TenantContractController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Display tenant's contracts
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Contract::class);

        $contracts = Contract::byTenant($request->user()->id)
            ->with(['listing.unit.property', 'landlord'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($contracts);
    }

    /**
     * Display the specified contract
     */
    public function show(Contract $contract): JsonResponse
    {
        $this->authorize('view', $contract);

        return response()->json($contract->load(['listing.unit.property', 'landlord', 'admin']));
    }

    /**
     * Accept pending contract
     */
    public function accept(Request $request, Contract $contract): JsonResponse
    {
        $this->authorize('accept', $contract);

        $contract->update([
            'status' => ContractStatus::ACTIVE,
        ]);

        // Audit log
        $this->auditService->log(
            actor: $request->user(),
            action: 'contract_accepted',
            subject: $contract,
            description: 'Tenant accepted contract',
            severity: 'info'
        );

        // Notify the landlord that the contract has been signed
        $tenant = $request->user();
        $eventId = "contract-signed:{$contract->id}";
        if (! $this->notificationService->exists($contract->landlord, $eventId)) {
            $this->notificationService->create(
                user: $contract->landlord,
                type: NotificationType::CONTRACT_SIGNED,
                title: 'Contract Signed',
                message: "{$tenant->full_name} has accepted the contract for \"{$contract->listing->title}\".",
                data: [
                    'event_id' => $eventId,
                    'contract_id' => $contract->id,
                    'tenant_id' => $tenant->id,
                ]
            );
        }

        return response()->json([
            'message' => 'Contract accepted and activated',
            'contract' => $contract->fresh(),
        ]);
    }

    /**
     * Terminate active contract
     */
    public function terminate(TerminateContractRequest $request, Contract $contract): JsonResponse
    {
        // TerminateContractRequest@authorize() already delegates to ContractPolicy@terminate,
        // but we repeat it here for defense-in-depth visibility.
        $this->authorize('terminate', $contract);

        $contract->update([
            'status' => ContractStatus::TERMINATED,
            'terminated_by' => TerminatedBy::TENANT,
            'termination_reason' => $request->reason,
        ]);

        // Audit log
        $this->auditService->log(
            actor: $request->user(),
            action: 'contract_terminated',
            subject: $contract,
            description: 'Tenant terminated contract',
            severity: 'warning'
        );

        // Notify the landlord that the tenant terminated
        $tenant = $request->user();
        $eventId = "contract-terminated:{$contract->id}:landlord";
        if (! $this->notificationService->exists($contract->landlord, $eventId)) {
            $this->notificationService->create(
                user: $contract->landlord,
                type: NotificationType::CONTRACT_TERMINATED,
                title: 'Contract Terminated',
                message: "{$tenant->full_name} has terminated the contract for \"{$contract->listing->title}\". Reason: {$request->reason}",
                data: [
                    'event_id' => $eventId,
                    'contract_id' => $contract->id,
                    'terminated_by' => 'tenant',
                    'reason' => $request->reason,
                ]
            );
        }

        return response()->json([
            'message' => 'Contract terminated',
            'contract' => $contract->fresh(),
        ]);
    }
}
