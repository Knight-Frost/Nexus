<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ContractStatus;
use App\Enums\LedgerStatus;
use App\Enums\ListingStatus;
use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\LedgerEntry;
use App\Models\Listing;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * AdminDashboardController
 *
 * Provides the platform command-center overview: headline statistics,
 * contract lifecycle distribution, platform-wide ledger health, listing
 * inventory by status, and the newest listings. Everything is computed with
 * grouped aggregate queries (no collections loaded just to be counted).
 */
class AdminDashboardController extends Controller
{
    /**
     * Get admin dashboard data.
     */
    public function index(): JsonResponse
    {
        // ── Headline counts ───────────────────────────────────────────────────
        $landlordCount = User::landlords()->count();
        $tenantCount = User::tenants()->count();
        $propertyCount = Property::count();
        $unitCount = Unit::count();

        // ── Listings grouped by status (one query) ────────────────────────────
        $listingCounts = Listing::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $listingsByStatus = [
            'draft' => (int) ($listingCounts[ListingStatus::DRAFT->value] ?? 0),
            'pending_review' => (int) ($listingCounts[ListingStatus::PENDING_REVIEW->value] ?? 0),
            'active' => (int) ($listingCounts[ListingStatus::ACTIVE->value] ?? 0),
            'rejected' => (int) ($listingCounts[ListingStatus::REJECTED->value] ?? 0),
            'inactive' => (int) ($listingCounts[ListingStatus::INACTIVE->value] ?? 0),
            'archived' => (int) ($listingCounts[ListingStatus::ARCHIVED->value] ?? 0),
        ];

        $totalListings = (int) $listingCounts->sum();

        // ── Contracts grouped by status (one query) ───────────────────────────
        $contractCounts = Contract::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $contracts = [
            'draft' => (int) ($contractCounts[ContractStatus::DRAFT->value] ?? 0),
            'pending_tenant' => (int) ($contractCounts[ContractStatus::PENDING_TENANT->value] ?? 0),
            'active' => (int) ($contractCounts[ContractStatus::ACTIVE->value] ?? 0),
            'terminated' => (int) ($contractCounts[ContractStatus::TERMINATED->value] ?? 0),
            'expired' => (int) ($contractCounts[ContractStatus::EXPIRED->value] ?? 0),
        ];

        // ── Ledger health (platform-wide) ─────────────────────────────────────
        $outstandingCents = (int) LedgerEntry::query()
            ->whereIn('status', [LedgerStatus::PENDING->value, LedgerStatus::OVERDUE->value])
            ->sum('amount_cents');

        $overdueCents = (int) LedgerEntry::query()
            ->where('status', LedgerStatus::OVERDUE)
            ->sum('amount_cents');

        // why: ledger entries are immutable and carry no paid_at timestamp, so
        // "collected this month" is measured against due_date — the obligation's
        // period — for entries now marked paid within the current calendar month.
        $collectedThisMonthCents = (int) LedgerEntry::query()
            ->where('status', LedgerStatus::PAID)
            ->whereBetween('due_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('amount_cents');

        // ── Recent activity ───────────────────────────────────────────────────
        $recentListings = Listing::with(['landlord', 'unit.property'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        return response()->json([
            'statistics' => [
                'landlords' => $landlordCount,
                'tenants' => $tenantCount,
                'properties' => $propertyCount,
                'units' => $unitCount,
                'pending_listings' => $listingsByStatus['pending_review'],
                'active_listings' => $listingsByStatus['active'],
                'total_listings' => $totalListings,
                'active_contracts' => $contracts['active'],
            ],
            'contracts' => $contracts,
            'ledger' => [
                'outstanding_cents' => $outstandingCents,
                'overdue_cents' => $overdueCents,
                'collected_this_month_cents' => $collectedThisMonthCents,
            ],
            'listings_by_status' => $listingsByStatus,
            'recent_listings' => $recentListings,
        ]);
    }
}
