<?php

namespace Database\Seeders\Dev;

use App\Enums\ApplicationStatus;
use App\Enums\ListingStatus;
use App\Models\Application;
use App\Models\Listing;

/**
 * ApplicationSeeder — rental applications across every status.
 *
 * Two coherent layers:
 *   1. Approved histories — every unit that ends up under contract has a prior
 *      approved (or landlord_review, for drafts) application from that tenant.
 *      This keeps the "applied → approved → signed" story truthful.
 *   2. Live pipeline — applicant tenants apply to the currently-active listings
 *      with a spread of submitted / in_review / landlord_review / rejected /
 *      withdrawn states so the landlord applicants screen and conversion
 *      analytics are meaningful.
 */
class ApplicationSeeder extends DevSeeder
{
    /** Applicant pool for the live pipeline (tenants not already on a lease). */
    private const APPLICANT_KEYS = [
        'tenant.applicant', 'tenant10', 'tenant11', 'tenant12', 'tenant13',
        'tenant14', 'tenant15', 'tenant16', 'tenant17',
    ];

    public function run(): void
    {
        $count = $this->seedApprovedHistories();
        $count += $this->seedLivePipeline();

        $this->command?->info("  ✓ Applications: {$count} across submitted/in-review/approved/rejected/withdrawn.");
    }

    /** Approved (or landlord_review) application for each contracted unit. */
    protected function seedApprovedHistories(): int
    {
        $count = 0;

        foreach (SeedCatalog::UNITS as $u) {
            if (! $u['contract'] || ! $u['tenant']) {
                continue;
            }

            $unit = $this->unitFromCatalog($u);
            $tenant = $this->user($u['tenant']);
            if (! $unit || ! $tenant || ! ($listing = $this->listingForUnit($unit))) {
                continue;
            }

            $isDraft = $u['contract'] === 'draft';

            $this->upsert($tenant->id, $listing, [
                'status' => $isDraft ? ApplicationStatus::LANDLORD_REVIEW->value : ApplicationStatus::APPROVED->value,
                'cover_note' => 'I would love to make this my home and can move in promptly.',
                'submitted_at' => now()->subDays(40),
                'reviewed_at' => now()->subDays(38),
                'decided_at' => $isDraft ? null : now()->subDays(37),
                'decision_reason' => $isDraft ? null : 'Strong application — references and income verified.',
            ]);
            $count++;
        }

        return $count;
    }

    /** A spread of live applications onto the active listings. */
    protected function seedLivePipeline(): int
    {
        $activeListings = Listing::where('status', ListingStatus::ACTIVE)->orderBy('id')->get();
        if ($activeListings->isEmpty()) {
            return 0;
        }

        $states = [
            ApplicationStatus::SUBMITTED,
            ApplicationStatus::IN_REVIEW,
            ApplicationStatus::LANDLORD_REVIEW,
            ApplicationStatus::REJECTED,
            ApplicationStatus::WITHDRAWN,
            ApplicationStatus::SUBMITTED,
        ];

        $count = 0;
        foreach (self::APPLICANT_KEYS as $i => $key) {
            $tenant = $this->user($key);
            if (! $tenant) {
                continue;
            }

            // Each applicant applies to 1–2 listings, cycling through the states.
            for ($n = 0; $n < 2; $n++) {
                $listing = $activeListings[($i + $n) % $activeListings->count()];
                $status = $states[($i + $n) % count($states)];

                $this->upsert($tenant->id, $listing, $this->fieldsForStatus($status));
                $count++;
            }
        }

        return $count;
    }

    /**
     * @return array<string,mixed>
     */
    protected function fieldsForStatus(ApplicationStatus $status): array
    {
        $base = [
            'status' => $status->value,
            'cover_note' => 'Interested in viewing and applying for this unit.',
            'submitted_at' => now()->subDays(rand(1, 14)),
        ];

        return match ($status) {
            ApplicationStatus::IN_REVIEW, ApplicationStatus::LANDLORD_REVIEW => array_merge($base, [
                'reviewed_at' => now()->subDays(1),
                'landlord_notes' => 'Reviewing references — internal note (never shown to tenant).',
            ]),
            ApplicationStatus::REJECTED => array_merge($base, [
                'reviewed_at' => now()->subDays(2),
                'decided_at' => now()->subDays(2),
                'decision_reason' => 'Another applicant was selected for this unit.',
            ]),
            ApplicationStatus::WITHDRAWN => array_merge($base, [
                'withdrawn_at' => now()->subDay(),
            ]),
            default => $base,
        };
    }

    protected function upsert(int $tenantId, Listing $listing, array $attributes): void
    {
        Application::updateOrCreate(
            ['tenant_id' => $tenantId, 'listing_id' => $listing->id],
            array_merge(['landlord_id' => $listing->landlord_id], $attributes),
        );
    }
}
