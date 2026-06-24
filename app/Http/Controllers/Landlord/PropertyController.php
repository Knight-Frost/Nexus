<?php

namespace App\Http\Controllers\Landlord;

use App\Enums\LedgerStatus;
use App\Enums\LedgerType;
use App\Enums\UnitAvailabilityStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePropertyRequest;
use App\Http\Requests\UpdatePropertyRequest;
use App\Models\LedgerEntry;
use App\Models\Property;
use App\Models\Unit;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PropertyController
 *
 * Handles landlord property management.
 * All operations are owner-restricted via policies.
 */
class PropertyController extends Controller
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    /**
     * Display a listing of the landlord's properties.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Property::class);

        $landlordId = $request->user()->id;

        $properties = $request->user()
            ->properties()
            ->withCount('units')
            ->orderBy('created_at', 'desc')
            ->get();

        $propertyIds = $properties->pluck('id');

        // Per-property unit availability counts (one grouped query, no N+1).
        $unitCounts = Unit::whereIn('property_id', $propertyIds)
            ->selectRaw('property_id, availability_status, COUNT(*) as aggregate')
            ->groupBy('property_id', 'availability_status')
            ->get()
            ->groupBy('property_id');

        // Per-property rent collected this calendar month. Matches the dashboard
        // definition exactly: RENT-type entries marked PAID with due_date in the
        // current month, scoped to this landlord, joined out to the owning
        // property via contract → listing → unit. One grouped query.
        $collectedByProperty = LedgerEntry::query()
            ->where('ledger_entries.landlord_id', $landlordId)
            ->where('ledger_entries.type', LedgerType::RENT->value)
            ->where('ledger_entries.status', LedgerStatus::PAID->value)
            ->whereBetween('ledger_entries.due_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->join('contracts', 'contracts.id', '=', 'ledger_entries.contract_id')
            ->join('listings', 'listings.id', '=', 'contracts.listing_id')
            ->join('units', 'units.id', '=', 'listings.unit_id')
            ->whereIn('units.property_id', $propertyIds)
            ->selectRaw('units.property_id as property_id, SUM(ledger_entries.amount_cents) as collected')
            ->groupBy('units.property_id')
            ->pluck('collected', 'property_id');

        $payload = $properties->map(function (Property $property) use ($unitCounts, $collectedByProperty) {
            // availability_status is enum-cast on the model, so key by its scalar value.
            $counts = ($unitCounts[$property->id] ?? collect())
                ->mapWithKeys(fn ($row) => [$row->availability_status->value => (int) $row->aggregate]);

            $total = (int) $property->units_count;
            $occupied = (int) ($counts[UnitAvailabilityStatus::OCCUPIED->value] ?? 0);
            $vacant = (int) ($counts[UnitAvailabilityStatus::AVAILABLE->value] ?? 0);

            return array_merge($property->toArray(), [
                'occupied_units' => $occupied,
                'vacant_units' => $vacant,
                'occupancy_rate' => (int) round($occupied / max($total, 1) * 100),
                'collected_this_month_cents' => (int) ($collectedByProperty[$property->id] ?? 0),
            ]);
        });

        return response()->json($payload);
    }

    /**
     * Store a newly created property.
     */
    public function store(StorePropertyRequest $request): JsonResponse
    {
        $this->authorize('create', Property::class);

        $property = new Property($request->validated());
        $property->landlord_id = $request->user()->id;
        $property->save();

        // Audit log
        $this->auditService->log(
            actor: $request->user(),
            action: 'property_created',
            subject: $property,
            description: "Created property: {$property->name}"
        );

        return response()->json([
            'message' => 'Property created successfully',
            'property' => $property->load('units'),
        ], 201);
    }

    /**
     * Display the specified property.
     */
    public function show(Property $property): JsonResponse
    {
        $this->authorize('view', $property);

        return response()->json($property->load(['units', 'activeUnits', 'mediaAssets']));
    }

    /**
     * Update the specified property.
     */
    public function update(UpdatePropertyRequest $request, Property $property): JsonResponse
    {
        $oldValues = $property->only(array_keys($request->validated()));

        $property->update($request->validated());

        // Audit log
        $this->auditService->log(
            actor: $request->user(),
            action: 'property_updated',
            subject: $property,
            description: "Updated property: {$property->name}",
            oldValues: $oldValues,
            newValues: $property->only(array_keys($request->validated()))
        );

        return response()->json([
            'message' => 'Property updated successfully',
            'property' => $property->fresh(['units']),
        ]);
    }

    /**
     * Remove the specified property (soft delete).
     */
    public function destroy(Request $request, Property $property): JsonResponse
    {
        $this->authorize('delete', $property);

        // Check if property has units
        if ($property->units()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete property with existing units. Please delete all units first.',
            ], 422);
        }

        $property->delete();

        // Audit log
        $this->auditService->log(
            actor: $request->user(),
            action: 'property_deleted',
            subject: $property,
            description: "Deleted property: {$property->name}"
        );

        return response()->json([
            'message' => 'Property deleted successfully',
        ]);
    }
}
