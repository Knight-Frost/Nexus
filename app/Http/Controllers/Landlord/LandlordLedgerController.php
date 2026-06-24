<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Models\LedgerEntry;
use App\Services\LedgerPresentationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * LandlordLedgerController
 *
 * Handles landlord ledger viewing (read-only). Each entry is decorated with a
 * deterministic display reference and a running outstanding balance — both are
 * derived projections; the ledger itself stays immutable.
 */
class LandlordLedgerController extends Controller
{
    public function __construct(
        protected LedgerPresentationService $presentation
    ) {}

    /**
     * Display landlord's ledger entries
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LedgerEntry::class);

        $entries = LedgerEntry::byLandlord($request->user()->id)
            ->with(['contract.listing', 'tenant', 'relatedRentEntry'])
            ->orderBy('due_date', 'desc')
            ->get();

        // Running balances must be computed chronologically across the whole set,
        // then mapped back onto the display order (due_date desc).
        $balances = $this->presentation->balancesAfter($entries);

        $payload = $entries->map(fn (LedgerEntry $entry) => array_merge($entry->toArray(), [
            'reference' => $this->presentation->reference($entry),
            'balance_after_cents' => $balances[$entry->id] ?? $this->presentation->balanceDelta($entry),
        ]));

        return response()->json($payload);
    }

    /**
     * Display the specified ledger entry
     */
    public function show(LedgerEntry $ledgerEntry): JsonResponse
    {
        $this->authorize('view', $ledgerEntry);

        $ledgerEntry->load(['contract.listing', 'tenant', 'relatedRentEntry']);

        // Balance after = sum of this contract's entries up to and including this
        // one, replayed chronologically.
        $contractEntries = LedgerEntry::where('contract_id', $ledgerEntry->contract_id)->get();
        $balances = $this->presentation->balancesAfter($contractEntries);

        return response()->json(array_merge($ledgerEntry->toArray(), [
            'reference' => $this->presentation->reference($ledgerEntry),
            'balance_after_cents' => $balances[$ledgerEntry->id] ?? $this->presentation->balanceDelta($ledgerEntry),
        ]));
    }
}
