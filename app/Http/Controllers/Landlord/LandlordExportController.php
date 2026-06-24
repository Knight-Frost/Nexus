<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\LedgerEntry;
use App\Models\Listing;
use App\Services\LedgerPresentationService;
use App\Services\TenantReadinessService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * LandlordExportController
 *
 * CSV downloads for the authenticated landlord. Every query is strictly scoped
 * to the landlord's own id — another landlord's data is never reachable here.
 * All exports are read-only projections; nothing is mutated.
 */
class LandlordExportController extends Controller
{
    public function __construct(
        protected LedgerPresentationService $presentation,
        protected TenantReadinessService $readiness
    ) {}

    /**
     * Ledger export (CSV).
     */
    public function ledger(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', LedgerEntry::class);

        $entries = LedgerEntry::byLandlord($request->user()->id)
            ->with(['tenant', 'contract.listing.unit.property'])
            ->orderBy('due_date', 'desc')
            ->get();

        $balances = $this->presentation->balancesAfter($entries);

        $rows = $entries->map(function (LedgerEntry $entry) use ($balances) {
            $unit = $entry->contract?->listing?->unit;
            $property = $unit?->property;

            $amountCedis = $entry->amount_cents / 100;
            if ($entry->type->isPayment()) {
                $amountCedis = -1 * abs($amountCedis);
            }

            return [
                $entry->due_date?->format('Y-m-d'),
                $this->tenantName($entry->tenant),
                $unit?->unit_number,
                $property?->name,
                $entry->type->value,
                $this->presentation->reference($entry),
                number_format($amountCedis, 2, '.', ''),
                $entry->status->value,
                number_format(($balances[$entry->id] ?? 0) / 100, 2, '.', ''),
            ];
        })->all();

        return $this->stream(
            'ledger.csv',
            ['Date', 'Tenant', 'Unit', 'Property', 'Type', 'Reference', 'Amount', 'Status', 'Balance after'],
            $rows
        );
    }

    /**
     * Listings export (CSV).
     */
    public function listings(Request $request): StreamedResponse
    {
        $listings = Listing::where('landlord_id', $request->user()->id)
            ->with(['unit.property'])
            ->withCount('applications')
            ->orderByDesc('created_at')
            ->get();

        $rows = $listings->map(function (Listing $listing) {
            $unit = $listing->unit;
            $property = $unit?->property;

            return [
                $listing->title,
                $property?->name,
                $unit?->unit_number,
                $listing->status->value,
                $unit ? number_format((float) $unit->rent_amount, 2, '.', '') : '',
                (int) $listing->view_count,
                (int) $listing->applications_count,
                $listing->featured ? 'yes' : 'no',
                $listing->updated_at?->format('Y-m-d'),
            ];
        })->all();

        return $this->stream(
            'listings.csv',
            ['Title', 'Property', 'Unit', 'Status', 'Rent', 'Views', 'Applications', 'Featured', 'Updated'],
            $rows
        );
    }

    /**
     * Applications export (CSV).
     */
    public function applications(Request $request): StreamedResponse
    {
        $applications = Application::where('landlord_id', $request->user()->id)
            ->with(['tenant', 'listing.unit'])
            ->latest()
            ->get();

        $rows = $applications->map(function (Application $application) {
            $tenant = $application->tenant;
            $listing = $application->listing;
            $readiness = $this->readiness->compute($tenant);

            return [
                $this->tenantName($tenant),
                $tenant?->email,
                $listing?->title,
                $listing?->unit?->unit_number,
                $application->status->value,
                $readiness['percentage'].'%',
                $application->submitted_at?->format('Y-m-d'),
            ];
        })->all();

        return $this->stream(
            'applications.csv',
            ['Applicant', 'Email', 'Listing', 'Unit', 'Status', 'Readiness %', 'Submitted'],
            $rows
        );
    }

    /**
     * Build a CSV streamed download with properly escaped fields.
     *
     * @param  list<string>  $header
     * @param  list<array<int, mixed>>  $rows
     */
    private function stream(string $filename, array $header, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $header);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Best-effort display name for a tenant (falls back to email).
     */
    private function tenantName(?\App\Models\User $tenant): ?string
    {
        if ($tenant === null) {
            return null;
        }

        $name = trim("{$tenant->first_name} {$tenant->last_name}");

        return $name !== '' ? $name : $tenant->email;
    }
}
